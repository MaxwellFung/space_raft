#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class SpaceraftHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path.split("?", 1)[0] != "/api/save-current":
            self.send_error(404, "Unknown endpoint")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            relative_path = payload.get("path")
            text = payload.get("json")

            if not isinstance(relative_path, str) or not isinstance(text, str):
                self.send_error(400, "Expected path and json strings")
                return

            target = (ROOT / relative_path).resolve()
            if ROOT not in target.parents or target.suffix != ".json":
                self.send_error(403, "Can only save JSON files inside this project")
                return

            json.loads(text)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        except OSError as error:
            self.send_error(500, str(error))
            return

        response = b'{"ok":true}\n'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def main():
    parser = argparse.ArgumentParser(description="Spaceraft local dev server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), SpaceraftHandler)
    print(f"Serving Spaceraft at http://{args.host}:{args.port}/index.html")
    print("Save start writes through POST /api/save-current")
    server.serve_forever()


if __name__ == "__main__":
    main()
