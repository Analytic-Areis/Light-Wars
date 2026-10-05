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

        # Wait for game to be initialized
        for i in range(20):
            ready = eval_js('typeof window.game !== "undefined" && window.game !== null', 10 + i)
            if ready: break
            time.sleep(0.3)

        print("Starting Level 1 to trigger Noobi-Wan instruction briefing...")
        eval_js('window.game.startLevel1();', 100)
        time.sleep(0.8) # Wait for initial briefing to appear

        # Check modal state and visibility
        status = eval_js('''
            (() => {
                const modal = document.getElementById('tutorialModal');
                const isVisible = modal && modal.classList.contains('visible');
                const display = modal ? getComputedStyle(modal).display : 'none';
                const title = document.getElementById('tutorialTitle') ? document.getElementById('tutorialTitle').innerText : '';
                return {
                    gameState: window.game.state,
                    isVisible,
                    display,
                    title
                };
            })()
        ''', 110)
        print("Noobi-Wan instruction status:", json.dumps(status, indent=2))
        assert status['gameState'] == 'TUTORIAL', f"Game state should be TUTORIAL (paused), got: {status['gameState']}"
        assert status['isVisible'], "Noobi-Wan instruction overlay is not marked visible!"
        assert status['display'] == 'flex', f"Noobi-Wan overlay display should be flex, got: {status['display']}"

        # Capture screenshot showing Noobi-Wan with game level paused in the background
        ws.send(json.dumps({
            'id': 900,
            'method': 'Page.captureScreenshot',
            'params': {'format': 'png'}
        }))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 900:
                img_data = base64.b64decode(resp['result']['data'])
                artifact_path = '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/noobi_wan_instructions_paused.png'
                with open(artifact_path, 'wb') as f:
                    f.write(img_data)
                print(f"Captured Noobi-Wan instruction overlay screenshot: {artifact_path}")
                break

        # Test dismissing instructions via button click (handle queued phase tutorial if any)
        print("\nTesting dismissing Noobi-Wan instructions...")
        for _ in range(3):
            is_vis = eval_js('document.getElementById("tutorialModal") && document.getElementById("tutorialModal").classList.contains("visible")', 200 + _)
            if not is_vis: break
            eval_js('document.getElementById("tutorialDismissBtn").click();', 205 + _)
            time.sleep(0.5)

        dismiss_status = eval_js('''
            (() => {
                const modal = document.getElementById('tutorialModal');
                const isVisible = modal && modal.classList.contains('visible');
                return {
                    gameState: window.game.state,
                    isVisible
                };
            })()
        ''', 210)
        print("After dismissal status:", json.dumps(dismiss_status, indent=2))
        assert dismiss_status['gameState'] == 'PLAYING', f"Game state should resume to PLAYING, got: {dismiss_status['gameState']}"
        assert not dismiss_status['isVisible'], "Modal should not be visible after dismissal!"

        # Test re-opening instructions field guide via showInstructionsModal() (or KeyH)
        print("\nTesting re-opening Noobi-Wan field guide...")
        eval_js('window.game.showInstructionsModal();', 300)
        time.sleep(0.4)

        field_guide_status = eval_js('''
            (() => {
                const modal = document.getElementById('tutorialModal');
                const isVisible = modal && modal.classList.contains('visible');
                const title = document.getElementById('tutorialTitle') ? document.getElementById('tutorialTitle').innerText : '';
                return {
                    gameState: window.game.state,
                    isVisible,
                    title
                };
            })()
        ''', 310)
        print("Field guide status:", json.dumps(field_guide_status, indent=2))
        assert field_guide_status['gameState'] == 'TUTORIAL', "Game state should pause on field guide open!"
        assert field_guide_status['isVisible'], "Field guide should be visible!"
        assert 'FIELD GUIDE' in field_guide_status['title'], f"Title should contain FIELD GUIDE, got {field_guide_status['title']}"

        # Capture field guide screenshot
        ws.send(json.dumps({
            'id': 901,
            'method': 'Page.captureScreenshot',
            'params': {'format': 'png'}
        }))
        while True:
            resp = json.loads(ws.recv())
            if resp.get('id') == 901:
                img_data = base64.b64decode(resp['result']['data'])
                artifact_path = '/home/srihith/.gemini/antigravity/brain/3e8c8e7e-a139-40cb-ba88-487ed13a12f9/noobi_wan_field_guide.png'
                with open(artifact_path, 'wb') as f:
                    f.write(img_data)
                print(f"Captured field guide screenshot: {artifact_path}")
                break

        print("\nALL NOOBI-WAN INSTRUCTION & PAUSE TESTS PASSED SUCCESSFULLY!")

    finally:
        chrome.terminate()
        chrome.wait()

if __name__ == '__main__':
    main()
