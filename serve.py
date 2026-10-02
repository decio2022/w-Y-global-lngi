#!/usr/bin/env python3
"""Static server for the page.

`python3 -m http.server` answers "/" with index.html, and this project's entry
point is main.html — so opening the preview root would show a directory listing
instead. This wrapper sends "/" to main.html and serves everything else as
usual.

    python3 serve.py [port]      # default port: 8000
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path in ("", "/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/main.html")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # The page is edited in place; never let a stale copy win.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"serving {ROOT} on http://localhost:{port}/ (-> /main.html)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
