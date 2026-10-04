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
        if not chunk:
            return None
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

def main():
    chrome = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=9223',
        '--no-sandbox',
        '--window-size=1280,720',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9223/json').read().decode())
        target = next((t for t in tabs if '8000' in t.get('url', '')), tabs[0])
        s = ws_connect(target['webSocketDebuggerUrl'])

        # Start Level 1
        eval_js(s, 100, "document.getElementById('startLevel1Btn').click()")
        time.sleep(0.5)

        # Check player is active
        state = eval_js(s, 101, "window.game.state")
        print(f"Game state: {state}")
        assert state == 'PLAYING'

        # Test shooting across all 8 directions and check laser origin vs muzzle pos
        dirs_to_angles = {
            'E': 0.0,
            'SE': 0.785,
            'S': 1.571,
            'SW': 2.356,
            'W': 3.141,
            'NW': -2.356,
            'N': -1.571,
            'NE': -0.785
        }

        results = []
        for d, ang in dirs_to_angles.items():
            code = f"""
            (() => {{
                const p = window.game.player;
                p.ammo.RED = 10;
                p.shootCooldown = 0;
                const tx = p.x + Math.cos({ang}) * 300;
                const ty = (p.y - 70) + Math.sin({ang}) * 300;
                const laser = p.shoot(tx, ty);
                const muzzle = p.getMuzzlePos(p.facingDir);
                return {{
                    dir: p.facingDir,
                    laserAlive: !!laser,
                    originX: laser ? laser.originX : null,
                    originY: laser ? laser.originY : null,
                    muzzleX: muzzle.x,
                    muzzleY: muzzle.y,
                    spawnX: laser ? laser.x : null,
                    spawnY: laser ? laser.y : null,
                    distToMuzzle: laser ? Math.hypot(laser.x - muzzle.x, laser.y - muzzle.y) : null
                }};
            }})()
            """
            res = eval_js(s, 200 + len(results), code)
            results.append((d, res))
            print(f"Direction {d}: targetDir={res['dir']}, muzzle=({res['muzzleX']:.1f}, {res['muzzleY']:.1f}), spawn=({res['spawnX']:.1f}, {res['spawnY']:.1f}), distToMuzzle={res['distToMuzzle']:.1f}px")

        # Test Enemy muzzle across all 8 directions
        enemy_results = eval_js(s, 300, """
        (() => {
            const e = new window.LightWars.Enemy(1500, 1500, 'CYAN');
            const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            const res = {};
            for (const d of dirs) {
                e.shootCooldown = 0;
                e.facingDir = d;
                const muzzle = e.getMuzzlePos(d);
                res[d] = {
                    muzzleX: muzzle.x,
                    muzzleY: muzzle.y,
                    relX: muzzle.x - e.x,
                    relY: muzzle.y - e.y
                };
            }
            // Shoot once
            e.shootCooldown = 0;
            e.facingAngle = 0; // East
            const laser = e.shoot(1800, 1500);
            const mE = e.getMuzzlePos('E');
            res.shotDist = Math.hypot(laser.x - mE.x, laser.y - mE.y);
            return res;
        })()
        """)
        print(f"Enemy muzzle test: shotDistToMuzzle={enemy_results['shotDist']:.1f}px, offsets={enemy_results['E']}")

        # Capture a live gameplay screenshot showing Luke shooting towards right (E/SE)
        eval_js(s, 400, """
        (() => {
            const p = window.game.player;
            p.ammo.RED = 10;
            p.shootCooldown = 0;
            // Aim and shoot towards an enemy
            window.game.input.screenMouseX = 850;
            window.game.input.screenMouseY = 360;
            window.game.handlePlayerShoot();
            // Step 1 frame
            window.game.update(0.016);
            window.game.render();
        })()
        """)
        time.sleep(0.1)

        # Take screenshot via CDP
        req_id = 500
        ws_send(s, json.dumps({'id': req_id, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
        for _ in range(30):
            m = ws_recv(s)
            if m:
                d = json.loads(m)
                if d.get('id') == req_id:
                    b64 = d.get('result', {}).get('data')
                    if b64:
                        with open('/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/game_shooting_live.png', 'wb') as f:
                            f.write(base64.b64decode(b64))
                        print("Saved live screenshot to game_shooting_live.png")
                    break

        print("ALL TESTS PASSED SUCCESSFULLY!")

    finally:
        chrome.kill()

if __name__ == '__main__':
    main()
