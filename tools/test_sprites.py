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

        # Wait for game initialization & all sprites to finish loading
        print("Waiting for game and all sprites to load...")
        for i in range(50):
            count = eval_js('window.game && window.game.spriteManager ? window.game.spriteManager.loadedCount : 0', 10 + i)
            if count and count >= 140:
                print(f"All sprites successfully loaded! Total loaded: {count}")
                break
            time.sleep(0.2)

        # Check sprite presence for Luke (idle & walk)
        luke_check = eval_js('''
            (() => {
                const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const sm = window.game.spriteManager;
                const res = {};
                for (const d of dirs) {
                    res[d] = {
                        idle: sm.hasSprite(`luke_${d}_idle`),
                        walk: sm.hasSprite(`luke_${d}_walk`)
                    };
                }
                return res;
            })()
        ''', 50)
        print("Luke directional sprites check:", json.dumps(luke_check, indent=2))
        for d, has in luke_check.items():
            assert has['idle'], f"Missing Luke idle sprite for direction {d}!"
            assert has['walk'], f"Missing Luke walk sprite for direction {d}!"

        # Check sprite presence for all Bot schemes and Boss
        schemes = ['RED', 'GREEN', 'BLUE', 'CYAN', 'MAGENTA', 'YELLOW', 'WHITE', 'BOSS'];
        bot_check = eval_js('''
            (() => {
                const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const schemes = ['RED', 'GREEN', 'BLUE', 'CYAN', 'MAGENTA', 'YELLOW', 'WHITE', 'BOSS'];
                const sm = window.game.spriteManager;
                const results = {};
                for (const s of schemes) {
                    results[s] = { idle: true, walk: true };
                    for (const d of dirs) {
                        if (!sm.hasSprite(`${s}_${d}_idle`)) results[s].idle = false;
                        if (!sm.hasSprite(`${s}_${d}_walk`)) results[s].walk = false;
                    }
                }
                return results;
            })()
        ''', 60)
        print("Bot & Boss schemes check:", json.dumps(bot_check, indent=2))
        for s, status in bot_check.items():
            assert status['idle'], f"Missing idle sprites for {s}!"
            assert status['walk'], f"Missing walk sprites for {s}!"

        # Start Level 1 and test rendering in-game
        print("Starting Level 1 with new sprites...")
        eval_js('window.game.startLevel1();', 100)
        time.sleep(1.0)

        # Place player and enemies of various colors in center of Level 1 room
        eval_js('''
            (() => {
                window.game.enemies = [];
                window.game.lasers = [];
                
                // Position player in center of room
                window.game.player.x = 768;
                window.game.player.y = 512;
                window.game.player.facingDir = 'SE';
                window.game.player.aimAngle = Math.PI / 4;

                // Spawn bots of different colors around player inside the room
                window.game.enemies.push(new window.LightWars.Enemy(650, 420, 'CYAN'));
                window.game.enemies.push(new window.LightWars.Enemy(890, 420, 'MAGENTA'));
                window.game.enemies.push(new window.LightWars.Enemy(650, 620, 'YELLOW'));
                window.game.enemies.push(new window.LightWars.Enemy(890, 620, 'RED'));

                // Set facing angles towards center player
                for (const e of window.game.enemies) {
                    e.facingAngle = Math.atan2(window.game.player.y - e.y, window.game.player.x - e.x);
                    e.facingDir = window.LightWars.SpriteManager.getDirection8(e.facingAngle);
                }
            })()
        ''', 110)

        # Let the game loop render for 0.5 seconds
        time.sleep(0.5)

        # Capture screenshot
        ws.send(json.dumps({
            'id': 999,
            'method': 'Page.captureScreenshot',
            'params': {'format': 'png'}
        }))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 999:
                img_data = base64.b64decode(resp['result']['data'])
                artifact_path = '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/new_sprites_gameplay.png'
                with open(artifact_path, 'wb') as f:
                    f.write(img_data)
                print(f"Gameplay screenshot saved to {artifact_path}")
                break

        print("\nALL NEW SPRITES TESTS PASSED SUCCESSFULLY!")

    finally:
        chrome.terminate()
        chrome.wait()

if __name__ == '__main__':
    main()
