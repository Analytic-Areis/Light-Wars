#!/usr/bin/env python3
import subprocess
import time
import json
import urllib.request
import socket
import os
import struct
import base64

def recv_exact(s, n):
    buf = b''
    while len(buf) < n:
        chunk = s.recv(n - len(buf))
        if not chunk: return None
        buf += chunk
    return buf

def ws_connect(ws_url):
    parts = ws_url.replace('ws://', '').split('/', 1)
    host, port = parts[0].split(':')
    path = '/' + parts[1]
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, int(port)))
    key = base64.b64encode(os.urandom(16)).decode('utf-8')
    req = (f'GET {path} HTTP/1.1\r\n'
           f'Host: {host}:{port}\r\n'
           f'Upgrade: websocket\r\n'
           f'Connection: Upgrade\r\n'
           f'Sec-WebSocket-Key: {key}\r\n'
           f'Sec-WebSocket-Version: 13\r\n\r\n')
    s.sendall(req.encode('utf-8'))
    resp = s.recv(4096).decode('utf-8')
    assert '101' in resp
    return s

def ws_send(s, text):
    payload = text.encode('utf-8')
    length = len(payload)
    mask = os.urandom(4)
    if length <= 125:
        header = bytes([0x81, 0x80 | length]) + mask
    elif length <= 65535:
        header = struct.pack('!BBH', 0x81, 0xFE, length) + mask
    else:
        header = struct.pack('!BBQ', 0x81, 0xFF, length) + mask
    s.sendall(header + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

def ws_recv(s):
    s.settimeout(2.0)
    try:
        hdr = recv_exact(s, 2)
        if not hdr: return None
        b1, b2 = hdr
        length = b2 & 0x7F
        if length == 126:
            ext = recv_exact(s, 2)
            length = struct.unpack('!H', ext)[0]
        elif length == 127:
            ext = recv_exact(s, 8)
            length = struct.unpack('!Q', ext)[0]
        payload = recv_exact(s, length)
        return payload.decode('utf-8', errors='ignore') if payload else None
    except socket.timeout:
        return None

def eval_js(s, req_id, expr):
    ws_send(s, json.dumps({'id': req_id, 'method': 'Runtime.evaluate', 'params': {'expression': expr, 'returnByValue': True}}))
    for _ in range(30):
        m = ws_recv(s)
        if m:
            d = json.loads(m)
            if d.get('id') == req_id:
                if 'result' in d:
                    res = d['result']
                    if 'exceptionDetails' in res:
                        print("JS EXCEPTION:", res['exceptionDetails'])
                        return None
                    return res.get('result', {}).get('value')
                return None
    return None

def capture_screenshot(s, req_id, out_path):
    ws_send(s, json.dumps({'id': req_id, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
    for _ in range(30):
        m = ws_recv(s)
        if m:
            d = json.loads(m)
            if d.get('id') == req_id:
                b64 = d.get('result', {}).get('data')
                if b64:
                    with open(out_path, 'wb') as f:
                        f.write(base64.b64decode(b64))
                    print(f"Saved screenshot to {out_path}")
                    return True
    return False

def main():
    chrome = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=9225',
        '--no-sandbox',
        '--window-size=1280,720',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9225/json').read().decode())
        target = next((t for t in tabs if '8000' in t.get('url', '')), tabs[0])
        s = ws_connect(target['webSocketDebuggerUrl'])

        # Wait for window.game to be defined
        state = None
        for _ in range(50):
            state = eval_js(s, 10, "typeof window.game !== 'undefined' ? window.game.state : null")
            if state:
                break
            time.sleep(0.1)
        print(f"Initial game state: {state}")
        assert state == 'MENU'

        # Check boss badge text
        boss_badge = eval_js(s, 11, "document.getElementById('bossRoleBadge').innerText")
        print(f"Boss badge text: {boss_badge}")
        assert "FINAL BOSS" in boss_badge

        # Capture initial menu screenshot
        capture_screenshot(s, 20, '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/comic_menu_page1_initial.png')

        # Test clicking Play Level 1
        eval_js(s, 30, "document.getElementById('startLevel1Btn').click()")
        time.sleep(0.5)
        play_state = eval_js(s, 31, "window.game.state")
        print(f"After clicking Play, state: {play_state}")
        assert play_state == 'PLAYING'

        # Return to menu
        eval_js(s, 40, "window.game.showMenu()")
        time.sleep(0.3)

        # Test boss defeated transition to MINI BOSS and Page 2 reveal
        eval_js(s, 50, """
        (() => {
            localStorage.setItem('lightwars_black_boss_defeated', 'true');
            window.game.updateComicMenuBossState();
        })()
        """)
        time.sleep(0.3)

        mini_boss_badge = eval_js(s, 51, "document.getElementById('bossRoleBadge').innerText")
        print(f"After defeating Black Boss, badge: {mini_boss_badge}")
        assert "MINI BOSS" in mini_boss_badge

        page2_teaser = eval_js(s, 52, "document.getElementById('page2TeaserBadge').innerText")
        print(f"Page 2 teaser: {page2_teaser}")

        capture_screenshot(s, 60, '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/comic_menu_page1_defeated_boss.png')

        # Reset localStorage back to clean initial state
        eval_js(s, 70, """
        (() => {
            localStorage.removeItem('lightwars_black_boss_defeated');
            window.game.updateComicMenuBossState();
        })()
        """)

        print("ALL COMIC MENU TESTS PASSED!")

    finally:
        chrome.kill()

if __name__ == '__main__':
    main()
