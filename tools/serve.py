#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

DEFAULT_PORT = 8000
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

def create_server(requested_port=None):
    auto_find = requested_port is None
    port = requested_port if requested_port is not None else DEFAULT_PORT

    for offset in range(20):
        current_port = port + offset
        try:
            socketserver.TCPServer.allow_reuse_address = True
            httpd = socketserver.TCPServer(("", current_port), GameHttpHandler)
            return httpd, current_port
        except OSError as e:
            if e.errno == 98:  # Address already in use
                if not auto_find:
                    print(f"Error: Port {current_port} is already in use by another process.")
                    print(f"To free port {current_port}, run: fuser -k {current_port}/tcp\n")
                    sys.exit(1)
                # If auto-find, try next port
                continue
            raise
    print(f"Error: Could not find an available port starting from {port}.")
    sys.exit(1)

def main():
    os.chdir(ROOT_DIR)
    specified_port = int(sys.argv[1]) if len(sys.argv) > 1 else None
    httpd, port = create_server(specified_port)

    print("==================================================")
    print(" Light-Wars Local HTTP Server")
    print("==================================================")
    print(f"  URL:       http://localhost:{port}")
    print(f"  Root:      {ROOT_DIR}")
    print("  COOP/COEP: Enabled (Godot 4 / SharedArrayBuffer ready)")
    print("==================================================")
    print(" Press Ctrl+C to shut down the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")

if __name__ == "__main__":
    main()
