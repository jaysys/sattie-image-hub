#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.run"
APP_NAME="$(basename "$ROOT_DIR")"
APP_NAME_SAFE="$(printf '%s' "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9._-' '-')"
PID_FILE="$PID_DIR/${APP_NAME_SAFE}.pid"
LOG_FILE="$PID_DIR/${APP_NAME_SAFE}.log"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-6005}"

mkdir -p "$PID_DIR"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "[ERROR] node_modules not found"
  echo "Run ./one-shot-setup.sh first."
  exit 1
fi

if [[ ! -f "$ROOT_DIR/dist/index.html" ]]; then
  echo "[INFO] dist not found. building first..."
  (
    cd "$ROOT_DIR"
    npm run build
  )
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${OLD_PID:-}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[INFO] already running (pid=$OLD_PID)"
    echo "URL: http://$HOST:$PORT"
    echo "LOG: $LOG_FILE"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[ERROR] port $PORT is already in use"
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
  exit 1
fi

(
  cd "$ROOT_DIR"
  nohup env PORT="$PORT" HOST="$HOST" NODE_ENV=production node server/index.js >"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
)

sleep 2
PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  echo "[OK] started (pid=$PID)"
  echo "URL: http://$HOST:$PORT"
  echo "LOG: $LOG_FILE"
else
  echo "[ERROR] failed to start. check log: $LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi
