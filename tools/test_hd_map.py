#!/usr/bin/env python3
import subprocess
import time
import json
import urllib.request
import websocket
import base64
import os

def main():
    chrome = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--remote-debugging-port=9228',
        '--remote-allow-origins=*',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1920,1080',
        'http://127.0.0.1:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)
    try:
        data = json.loads(urllib.request.urlopen('http://127.0.0.1:9228/json').read().decode())
        page_target = next(t for t in data if t.get('type') == 'page' and '8000' in t.get('url'))
        ws_url = page_target['webSocketDebuggerUrl']
        ws = websocket.create_connection(ws_url)

        def eval_js(expr, req_id):
            msg = {
                'id': req_id,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': expr,
                    'returnByValue': True
                }
            }
            ws.send(json.dumps(msg))
            while True:
                resp = json.loads(ws.recv())
                if resp.get('id') == req_id:
                    res = resp.get('result', {})
                    if 'exceptionDetails' in res:
                        print("JS Error:", res['exceptionDetails'])
                        return None
                    return res.get('result', {}).get('value')

        ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
        ws.send(json.dumps({'id': 2, 'method': 'Page.enable'}))

        # Wait for game initialization
        for i in range(25):
            ready = eval_js('typeof window.game !== "undefined" && window.game !== null', 10 + i)
            if ready: break
            time.sleep(0.4)

        print("Starting Level 1 with HD Map...")
        eval_js('window.game.startLevel1();', 100)
        time.sleep(1.0)

        # Verify map dimensions and natural image size
        map_info = eval_js('''({
            mapWidth: window.game.arena.width,
            mapHeight: window.game.arena.height,
            naturalWidth: window.game.arena.mapImg.naturalWidth,
            naturalHeight: window.game.arena.mapImg.naturalHeight,
            complete: window.game.arena.mapImg.complete,
            playerX: window.game.player.x,
            playerY: window.game.player.y
        })''', 101)
        print("Map Image Info:", json.dumps(map_info, indent=2))
        assert map_info['naturalWidth'] == 6144, f"Expected naturalWidth 6144, got {map_info['naturalWidth']}"
        assert map_info['naturalHeight'] == 4096, f"Expected naturalHeight 4096, got {map_info['naturalHeight']}"

        # Capture screenshot 1: Spawn / Recharge Station with Hero
        def capture_screenshot(filename):
            ws.send(json.dumps({
                'id': 999,
                'method': 'Page.captureScreenshot',
                'params': {'format': 'png'}
            }))
            while True:
                resp = json.loads(ws.recv())
                if resp.get('id') == 999:
                    img_data = base64.b64decode(resp['result']['data'])
                    out_path = os.path.join('/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9', filename)
                    with open(out_path, 'wb') as f:
                        f.write(img_data)
                    print(f"Captured screenshot to {out_path}")
                    break

        time.sleep(0.5)
        capture_screenshot('level1_hd_map_spawn.png')

        # Move player deep inside the map (e.g. near the machinery / crates section)
        eval_js('''
            window.game.player.x = 2400;
            window.game.player.y = 1200;
            window.game.player.facingDir = 'SE';
        ''', 102)

        time.sleep(0.8)
        capture_screenshot('level1_hd_map_deep_inside.png')

        # Also run test_point_blank to ensure all physics & collisions remain 100% working
        print("Running collision checks...")
        col_check = eval_js('''({
            isSpawnBlocked: window.game.arena.isPointBlocked(3689, 1161),
            isWallBlocked: window.game.arena.isPointBlocked(100, 100),
            isPlayerWalkable: window.game.arena.isWalkableTile(window.game.arena.toGrid(2400, 1200).c, window.game.arena.toGrid(2400, 1200).r)
        })''', 103)
        print("Collision check info:", json.dumps(col_check, indent=2))
        assert not col_check['isSpawnBlocked'], "Spawn tile should not be blocked!"
        assert col_check['isWallBlocked'], "Border tile should be blocked!"

        print("\nAll HD map tests and captures completed successfully!")

    finally:
        chrome.terminate()
        chrome.wait()

if __name__ == '__main__':
    main()
