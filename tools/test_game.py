#!/usr/bin/env python3
import subprocess
import time
import json
import urllib.request
import websocket
import base64

def run_test():
    proc = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--remote-debugging-port=9222',
        '--remote-allow-origins=*',
        '--no-sandbox',
        '--disable-gpu',
        '--window-size=1280,720',
        'http://127.0.0.1:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2)
    try:
        data = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read().decode())
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
        time.sleep(1)

        # Wait until window.game exists
        for i in range(20):
            ready = eval_js('typeof window.game !== "undefined" && window.game !== null', 100 + i)
            if ready:
                print("Game instance ready!")
                break
            time.sleep(0.5)

        # 1. Start Level 1
        res_start = eval_js('''
            (function() {
                window.game.startLevel1();
                return {
                    state: window.game.state,
                    orbsCount: window.game.orbs.length,
                    playerAmmo: window.game.player.ammo,
                    playerPos: { x: window.game.player.x, y: window.game.player.y }
                };
            })()
        ''', 200)
        print("1. Level 1 Started:", json.dumps(res_start, indent=2))

        time.sleep(1.5)

        # 2. Check Sprites
        res_sprites = eval_js('''
            (function() {
                const sm = window.game.spriteManager;
                const heroSprites = Object.keys(sm.sprites).filter(k => k.startsWith('hero_'));
                return {
                    totalSpritesLoaded: Object.keys(sm.sprites).length,
                    heroSpritesLoaded: heroSprites.length,
                    sampleHeroSprites: heroSprites.slice(0, 8)
                };
            })()
        ''', 300)
        print("2. Sprites Info:", json.dumps(res_sprites, indent=2))

        # 3. Crystal & Ammo Mechanics
        res_crystal = eval_js('''
            (function() {
                const p = window.game.player;
                const initialYellow = p.ammo.YELLOW;
                const crystal1 = new window.LightWars.AmmoCrystal(p.x, p.y, 'YELLOW', 0);
                crystal1.collect(p, window.game);
                const after1 = p.ammo.YELLOW;
                
                const crystal2 = new window.LightWars.AmmoCrystal(p.x, p.y, 'YELLOW', 0);
                crystal2.collect(p, window.game);
                const after2 = p.ammo.YELLOW;

                return {
                    initialYellow,
                    after1stCrystal: after1,
                    after2ndCrystal: after2,
                    strictlyPlusOne: (after1 === initialYellow + 1) && (after2 === initialYellow + 2)
                };
            })()
        ''', 400)
        print("3. Crystal Mechanics Test:", json.dumps(res_crystal, indent=2))

        # 4. Recharge Station Check
        res_station = eval_js('''
            (function() {
                const p = window.game.player;
                p.x = 1352;
                p.y = 1502;
                for (let i = 0; i < 4; i++) {
                    p.update(0.3, { keys: {} }, window.game.arena);
                }
                return {
                    yellowAfterRechargeStation: p.ammo.YELLOW,
                    redAmmo: p.ammo.RED,
                    greenAmmo: p.ammo.GREEN,
                    blueAmmo: p.ammo.BLUE,
                    craftedAmmoPreserved: p.ammo.YELLOW === 2
                };
            })()
        ''', 500)
        print("4. Recharge Station Check:", json.dumps(res_station, indent=2))

        # 5. Screenshot
        ws.send(json.dumps({'id': 600, 'method': 'Page.captureScreenshot'}))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 600:
                raw = base64.b64decode(resp['result']['data'])
                with open('/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/game_live_screenshot.png', 'wb') as f:
                    f.write(raw)
                print("5. Live screenshot saved!")
                break

        ws.close()
    finally:
        proc.terminate()

if __name__ == '__main__':
    run_test()
