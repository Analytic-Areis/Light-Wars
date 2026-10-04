#!/usr/bin/env python3
import subprocess
import time
import json
import urllib.request
import websocket
import base64

def main():
    chrome = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--remote-debugging-port=9227',
        '--remote-allow-origins=*',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1920,1080',
        'http://127.0.0.1:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)
    try:
        data = json.loads(urllib.request.urlopen('http://127.0.0.1:9227/json').read().decode())
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
        for i in range(20):
            ready = eval_js('typeof window.game !== "undefined" && window.game !== null', 10 + i)
            if ready: break
            time.sleep(0.5)

        print("Starting Level 1...")
        eval_js('window.game.startLevel1();', 100)
        time.sleep(0.5)

        # Place player safely in open floor away from any immediate enemies
        eval_js('''
            window.game.enemies = [];
            window.game.lasers = [];
            window.game.player.x = 3400;
            window.game.player.y = 1500;
            window.game.player.vx = 0;
            window.game.player.vy = 0;
            window.game.player.health = 3;
            window.game.player.invulnerableTimer = 0;
        ''', 101)

        init_status = eval_js('({ x: window.game.player.x, y: window.game.player.y, hp: window.game.player.health })', 102)
        print(f"Initial player pos: {init_status}")

        # TEST 1: MELEE COLLISION SHOULD APPLY ZERO KNOCKBACK
        print("\n--- TEST 1: MELEE CONTACT ---")
        eval_js('''
            (() => {
                const e = new window.LightWars.Enemy(3360, 1500, 'CYAN');
                e.shootCooldown = 999; // ensure it doesn't shoot yet
                window.game.enemies.push(e);
            })()
        ''', 103)

        time.sleep(0.2) # let game run a few frames

        after_melee = eval_js('''({
            x: window.game.player.x,
            y: window.game.player.y,
            vx: window.game.player.vx,
            vy: window.game.player.vy,
            hp: window.game.player.health,
            invulnerableTimer: window.game.player.invulnerableTimer,
            distMoved: Math.hypot(window.game.player.x - 3400, window.game.player.y - 1500)
        })''', 120)
        print(f"After melee collision: {after_melee}")
        assert after_melee['distMoved'] == 0, f"Melee collision caused unwanted displacement! {after_melee['distMoved']}"
        assert after_melee['vx'] == 0 and after_melee['vy'] == 0, f"Melee collision caused unwanted velocity! vx={after_melee['vx']}, vy={after_melee['vy']}"
        assert after_melee['hp'] == 2, f"Melee collision damage failed! hp={after_melee['hp']}"
        print(">>> Step 1 PASSED: Zero impact during melee collision, player took damage and entered invulnerability frames.")

        # TEST 2: ENEMY SHOOTS FROM POINT BLANK (WHILE JUST BESIDE PLAYER)
        print("\n--- TEST 2: POINT-BLANK SHOT IMPACT ---")
        shot_res = eval_js('''
            (() => {
                const e = window.game.enemies[0];
                e.shootCooldown = 0;
                const laser = e.shoot(window.game.player.x, window.game.player.y);
                const info = laser ? { x: laser.x, y: laser.y, vx: laser.vx, vy: laser.vy, angle: laser.angle } : null;
                if (laser) {
                    window.game.lasers.push(laser);
                }
                return {
                    laser: info,
                    playerXBefore: window.game.player.x,
                    playerYBefore: window.game.player.y
                };
            })()
        ''', 130)
        print(f"Point-blank laser details: {shot_res}")
        assert shot_res['laser'] is not None, "Laser was not spawned!"
        assert shot_res['laser']['vx'] > 0, f"Laser vx should be positive towards player! vx={shot_res['laser']['vx']}"

        # Wait a short duration (0.2s = ~12 frames) for shot to hit and knock player back
        time.sleep(0.2)

        after_shot = eval_js('''({
            x: window.game.player.x,
            y: window.game.player.y,
            vx: window.game.player.vx,
            vy: window.game.player.vy,
            distMoved: Math.hypot(window.game.player.x - 3400, window.game.player.y - 1500),
            lasersCount: window.game.lasers.length
        })''', 150)
        print(f"After point-blank shot: {after_shot}")

        assert after_shot['distMoved'] > 1.0, f"Player did NOT move from point-blank shot impact! distMoved={after_shot['distMoved']}"
        assert after_shot['x'] > 3400, f"Player was NOT knocked away from the enemy! x={after_shot['x']}"
        print(">>> Step 2 PASSED: Point-blank shot hit player and knocked player backwards away from enemy!")

        # TEST 3: PLAYER BESIDE WALL - IMPACT MUST NOT PUSH INTO WALL
        print("\n--- TEST 3: WALL COLLISION SAFETY ---")
        eval_js('''
            (() => {
                window.game.lasers = [];
                window.game.enemies = [];
                // Place player near right wall (r=4, c=14 is open, c=15 is solid wall)
                const openX = 2525;
                const openY = 768;
                window.game.player.x = openX;
                window.game.player.y = openY;
                window.game.player.vx = 0;
                window.game.player.vy = 0;

                // Enemy positioned to the left (openX - 45), shooting directly into player towards the wall (+X)
                const e = new window.LightWars.Enemy(openX - 45, openY, 'RED');
                e.shootCooldown = 0;
                const l = e.shoot(openX, openY);
                if (l) window.game.lasers.push(l);
            })()
        ''', 160)

        # Wait 0.3s for shot to strike and knock player towards the wall
        time.sleep(0.3)

        wall_test = eval_js('''({
            x: window.game.player.x,
            y: window.game.player.y,
            isBlocked: window.game.arena.isPointBlocked(window.game.player.x, window.game.player.y),
            safePos: window.game.arena.pushOutOfWall(window.game.player.x, window.game.player.y, window.game.player.radius)
        })''', 180)
        print(f"Wall test result: {wall_test}")
        assert not wall_test['isBlocked'], f"Player was pushed into wall! isBlocked={wall_test['isBlocked']}"
        print(">>> Step 3 PASSED: Player never pushed into wall by shot impact!")

        # Take a screenshot artifact for verification
        screenshot_msg = {
            'id': 999,
            'method': 'Page.captureScreenshot',
            'params': {'format': 'png'}
        }
        ws.send(json.dumps(screenshot_msg))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 999:
                img_data = base64.b64decode(resp['result']['data'])
                artifact_path = '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/point_blank_impact_verified.png'
                with open(artifact_path, 'wb') as f:
                    f.write(img_data)
                print(f"Screenshot saved to {artifact_path}")
                break

        print("\n=======================================================")
        print("ALL POINT-BLANK IMPACT & WALL TESTS PASSED SUCCESSFULLY!")
        print("=======================================================")

    finally:
        chrome.terminate()
        chrome.wait()

if __name__ == '__main__':
    main()
