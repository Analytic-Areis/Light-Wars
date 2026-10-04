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
        '--remote-debugging-port=9229',
        '--remote-allow-origins=*',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1920,1080',
        'http://127.0.0.1:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)
    try:
        data = json.loads(urllib.request.urlopen('http://127.0.0.1:9229/json').read().decode())
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

        print("Starting Level 1 at 1.0x Scale...")
        eval_js('window.game.startLevel1();', 100)
        time.sleep(1.0)

        # 1. Verify map properties
        map_info = eval_js('''({
            scale: window.game.arena.scale,
            mapWidth: window.game.arena.width,
            mapHeight: window.game.arena.height,
            naturalWidth: window.game.arena.mapImg.naturalWidth,
            naturalHeight: window.game.arena.mapImg.naturalHeight,
            playerX: window.game.player.x,
            playerY: window.game.player.y,
            playerHp: window.game.player.health,
            enemiesCount: window.game.enemies.length
        })''', 101)
        print("Map & Player Info:", json.dumps(map_info, indent=2))
        assert map_info['scale'] == 1.0, f"Expected scale 1.0, got {map_info['scale']}"
        assert map_info['mapWidth'] == 1536, f"Expected mapWidth 1536, got {map_info['mapWidth']}"
        assert map_info['mapHeight'] == 1024, f"Expected mapHeight 1024, got {map_info['mapHeight']}"
        assert map_info['enemiesCount'] == 2, f"Expected 2 enemies in Phase 1, got {map_info['enemiesCount']}"

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
        capture_screenshot('level1_1x_scale_spawn.png')

        # 2. Test movement to center floor tile
        print("Testing movement towards center floor tile...")
        eval_js('''
            // Move player to center floor tile next to central crate
            window.game.player.x = 750;
            window.game.player.y = 450;
            window.game.player.facingDir = 'S';
        ''', 102)

        time.sleep(0.5)
        capture_screenshot('level1_1x_scale_center_tile.png')

        # 3. Test combat: Player shooting and destroying cyan enemy
        print("Testing combat...")
        eval_js('''
            (() => {
                // Aim and fire RED laser at first cyan enemy
                const enemy = window.game.enemies[0];
                window.game.player.selectColorIndex(0); // RED
                const laser = window.game.player.shoot(enemy.x, enemy.y);
                if (laser) window.game.lasers.push(laser);
            })()
        ''', 103)

        time.sleep(0.5)
        capture_screenshot('level1_1x_scale_combat.png')

        # 4. Verify wall collision at 1.0x scale
        wall_check = eval_js('''({
            isCenterBlocked: window.game.arena.isPointBlocked(750, 450),
            isWallBlocked: window.game.arena.isPointBlocked(50, 50),
            playerRadius: window.game.player.radius
        })''', 104)
        print("Collision Check:", json.dumps(wall_check, indent=2))
        assert not wall_check['isCenterBlocked'], "Center tile should not be blocked!"
        assert wall_check['isWallBlocked'], "Boundary wall should be blocked!"

        print("\nAll 1.0x Scale gameplay tests passed successfully!")

    finally:
        chrome.terminate()
        chrome.wait()

if __name__ == '__main__':
    main()
