#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class GameHttpHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def end_headers(self):
        # Enable Cross-Origin Isolation for Godot 4 / SharedArrayBuffer
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

def main():
    os.chdir(ROOT_DIR)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), GameHttpHandler) as httpd:
        print(f"==================================================")
        print(f" Light-Wars Local HTTP Server")
        print(f"==================================================")
        print(f"  URL:       http://localhost:{PORT}")
        print(f"  Root:      {ROOT_DIR}")
        print(f"  COOP/COEP: Enabled (Godot 4 / SharedArrayBuffer ready)")
        print(f"==================================================")
        print(f" Press Ctrl+C to shut down the server.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    main()
