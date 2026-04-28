#!/usr/bin/env bash
# APED visual-companion server (opt-in via `aped-method visual-companion`).
#
# Lightweight, dependency-free HTTP server for the /aped-brainstorm visual
# companion. Serves frame-template.html at `/`, accepts choice events at
# `/events`, watches a content directory and reloads the latest fragment.
#
# Backed by `python3 -m http.server`-style logic implemented directly with
# `python3` so we don't ship a node dependency. Falls back to a simple
# /bin/bash + /dev/tcp loop only if python3 is unavailable.
#
# Usage:
#   start-server.sh [--port <port>] [--state-dir <path>] [--content-dir <path>]
#
# Defaults:
#   --port         3737 (or BRAINSTORM_PORT env, or config.yaml visual_companion.port)
#   --state-dir    .aped/visual-companion/state    (events appended here)
#   --content-dir  .aped/visual-companion/content  (HTML fragments served here)
#
# The server writes click events to <state-dir>/events as JSONL:
#   {"choice":"<value>","ts":<unix-millis>}
#
# Press Ctrl+C to stop, or kill via the PID printed at startup.

set -u
set -o pipefail

PORT=""
STATE_DIR=""
CONTENT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"; shift 2 ;;
    --state-dir)
      STATE_DIR="$2"; shift 2 ;;
    --content-dir)
      CONTENT_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "start-server.sh: unknown arg: $1" >&2
      exit 2 ;;
  esac
done

# Resolve port from arg → env → config.yaml → default 3737.
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

if [[ -z "$PORT" ]]; then
  PORT="${BRAINSTORM_PORT:-}"
fi

if [[ -z "$PORT" ]]; then
  for cfg in "$PROJECT_ROOT/.aped/config.yaml" "$PROJECT_ROOT/aped/config.yaml"; do
    if [[ -f "$cfg" ]]; then
      # Find `visual_companion:` block, extract `port:` at 2-space indent.
      cfg_port=$(awk '
        /^visual_companion:[[:space:]]*$/ { in_block=1; next }
        in_block && /^[^[:space:]]/ { in_block=0 }
        in_block && /^  port:/ {
          sub(/^  port:[[:space:]]*/, "")
          sub(/[ \t]*#.*$/, "")
          gsub(/["'\'' ]/, "")
          print
          exit
        }
      ' "$cfg" 2>/dev/null || true)
      if [[ -n "$cfg_port" ]]; then PORT="$cfg_port"; break; fi
    fi
  done
fi

PORT="${PORT:-3737}"

if [[ -z "$STATE_DIR" ]]; then
  STATE_DIR="$PROJECT_ROOT/.aped/visual-companion/state"
fi
if [[ -z "$CONTENT_DIR" ]]; then
  CONTENT_DIR="$PROJECT_ROOT/.aped/visual-companion/content"
fi

mkdir -p "$STATE_DIR" "$CONTENT_DIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAME_TEMPLATE="$SCRIPT_DIR/frame-template.html"

if [[ ! -f "$FRAME_TEMPLATE" ]]; then
  echo "start-server.sh: frame-template.html not found at $FRAME_TEMPLATE" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "start-server.sh: python3 not found on PATH — cannot start server." >&2
  echo "  Install python3 or run the brainstorm flow without the visual companion." >&2
  exit 1
fi

echo "{\"type\":\"server-starting\",\"port\":$PORT,\"state_dir\":\"$STATE_DIR\",\"content_dir\":\"$CONTENT_DIR\"}"

export APED_VC_PORT="$PORT"
export APED_VC_STATE_DIR="$STATE_DIR"
export APED_VC_CONTENT_DIR="$CONTENT_DIR"
export APED_VC_FRAME_TEMPLATE="$FRAME_TEMPLATE"

# Inline python server. Kept here so the bash wrapper stays the only
# entrypoint and we don't need a sibling .py file. This server:
#   - GET /                → serves frame-template.html with newest content
#                            fragment from CONTENT_DIR injected into
#                            <div id="content"></div>.
#   - POST /events         → appends body line to STATE_DIR/events.
#   - GET /healthz         → "ok".
exec python3 - <<'PY_EOF'
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("APED_VC_PORT", "3737"))
STATE_DIR = os.environ["APED_VC_STATE_DIR"]
CONTENT_DIR = os.environ["APED_VC_CONTENT_DIR"]
FRAME_TEMPLATE = os.environ["APED_VC_FRAME_TEMPLATE"]

with open(FRAME_TEMPLATE, "r", encoding="utf-8") as f:
    FRAME_HTML = f.read()


def newest_fragment():
    try:
        entries = [
            os.path.join(CONTENT_DIR, name)
            for name in os.listdir(CONTENT_DIR)
            if name.endswith(".html")
        ]
    except FileNotFoundError:
        return ""
    if not entries:
        return ""
    entries.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    try:
        with open(entries[0], "r", encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def render_page():
    fragment = newest_fragment()
    placeholder = '<div id="content"></div>'
    if not fragment:
        return FRAME_HTML
    injected = '<div id="content">' + fragment + "</div>"
    if placeholder in FRAME_HTML:
        return FRAME_HTML.replace(placeholder, injected, 1)
    return FRAME_HTML + injected


def append_event(payload):
    line = json.dumps(payload, separators=(",", ":")) + "\n"
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, "events"), "a", encoding="utf-8") as f:
        f.write(line)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[visual-companion] " + (fmt % args) + "\n")

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/?"):
            body = render_page().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/healthz":
            body = b"ok"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/events":
            self.send_response(404)
            self.end_headers()
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        raw = self.rfile.read(length) if length > 0 else b""
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            data = {"raw": raw.decode("utf-8", "replace")}
        if not isinstance(data, dict):
            data = {"value": data}
        data.setdefault("ts", int(time.time() * 1000))
        try:
            append_event(data)
        except OSError as exc:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(exc)}).encode("utf-8"))
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')


def main():
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write(
        "[visual-companion] listening on http://127.0.0.1:%d (state=%s)\n"
        % (PORT, STATE_DIR)
    )
    print(json.dumps({
        "type": "server-started",
        "port": PORT,
        "url": "http://127.0.0.1:%d" % PORT,
        "state_dir": STATE_DIR,
        "content_dir": CONTENT_DIR,
    }))
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        sys.stderr.write("[visual-companion] shutting down\n")
        server.server_close()


if __name__ == "__main__":
    main()
PY_EOF
