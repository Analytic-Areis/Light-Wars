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
        '--window-size=1920,1080',
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
                    canvasWidth: window.game.canvas.width,
                    canvasHeight: window.game.canvas.height,
                    viewportWidth: window.game.camera.viewportWidth,
                    viewportHeight: window.game.camera.viewportHeight,
                    barrelsCount: window.game.barrels.length,
                    playerPos: { x: window.game.player.x, y: window.game.player.y }
                };
            })()
        ''', 200)
        print("1. Level 1 Started & Fullscreen Window Test:", json.dumps(res_start, indent=2))

        time.sleep(1.0)

        # 2. Check Sprites & Idle Frames
        res_sprites = eval_js('''
            (function() {
                const sm = window.game.spriteManager;
                const heroIdleSprites = Object.keys(sm.sprites).filter(k => k.startsWith('hero_') && k.includes('_idle_'));
                const p = window.game.player;
                const initialIdle = p.idleAnimTime;
                // Simulate stationary update
                p.update(0.5, { keys: {} }, window.game.arena);
                const afterIdle = p.idleAnimTime;
                return {
                    heroIdleFramesLoaded: heroIdleSprites.length,
                    sampleIdleSprites: heroIdleSprites.slice(0, 8),
                    initialIdleTime: initialIdle,
                    afterIdleTime: afterIdle,
                    idleAdvancing: afterIdle > initialIdle
                };
            })()
        ''', 300)
        print("2. Idle Sprites & Animation Test:", json.dumps(res_sprites, indent=2))

        # 3. Free Movement Across Floor Test (WASD)
        res_movement = eval_js('''
            (function() {
                const p = window.game.player;
                const startPos = { x: p.x, y: p.y };
                // Move Right (D)
                for (let i = 0; i < 10; i++) {
                    p.update(0.1, { keys: { 'KeyD': true } }, window.game.arena);
                }
                const posAfterD = { x: p.x, y: p.y };
                // Move Up (W)
                for (let i = 0; i < 10; i++) {
                    p.update(0.1, { keys: { 'KeyW': true } }, window.game.arena);
                }
                const posAfterW = { x: p.x, y: p.y };

                return {
                    startPos,
                    posAfterD,
                    posAfterW,
                    movedX: Math.abs(posAfterD.x - startPos.x) > 50,
                    movedY: Math.abs(posAfterW.y - posAfterD.y) > 50
                };
            })()
        ''', 400)
        print("3. Free Movement Test:", json.dumps(res_movement, indent=2))

        # 4. Perimeter Border Clamping Test (Attempt to walk out of map)
        res_border = eval_js('''
            (function() {
                const p = window.game.player;
                // Move aggressively towards the North-West border
                for (let i = 0; i < 100; i++) {
                    p.update(0.1, { keys: { 'KeyA': true, 'KeyW': true } }, window.game.arena);
                }
                const gridPos = window.game.arena.toGrid(p.x, p.y);
                const isInsideWalkable = window.game.arena.isWalkableTile(Math.round(gridPos.gx), Math.round(gridPos.gy));
                return {
                    finalPlayerX: p.x,
                    finalPlayerY: p.y,
                    gridGx: gridPos.gx,
                    gridGy: gridPos.gy,
                    isInsideWalkable,
                    stoppedAtBorder: gridPos.gx >= 0.5 && gridPos.gy >= 0.5
                };
            })()
        ''', 500)
        print("4. Border Clamping Test:", json.dumps(res_border, indent=2))

        # Reset player to center of arena for the screenshot
        eval_js('''
            (function() {
                window.game.player.x = 2650;
                window.game.player.y = 1550;
                window.game.camera.x = 2650;
                window.game.camera.y = 1550;
                window.game.player.facingDir = 'S';
                window.game.player.idleAnimTime = 0;
            })()
        ''', 550)

        time.sleep(0.5)

        # 5. Capture Live In-Game Screenshot
        ws.send(json.dumps({'id': 600, 'method': 'Page.captureScreenshot'}))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 600:
                raw = base64.b64decode(resp['result']['data'])
                with open('/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/game_live_screenshot.png', 'wb') as f:
                    f.write(raw)
                print("5. Live screenshot saved to game_live_screenshot.png!")
                break

        ws.close()
    finally:
        proc.terminate()

if __name__ == '__main__':
    run_test()
