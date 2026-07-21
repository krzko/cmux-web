#!/usr/bin/env bash
# Start/stop cmux-web on the tailnet: runs the built Node server bound to
# loopback and fronts it with `tailscale serve` over HTTPS. Reads .env for
# APP_PASSWORD / CMUX_* (the production server does not auto-load it).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$DIR/.output"
# The server runs from a snapshot of the build, not .output directly, so a later
# `pnpm build` (which rewrites .output with new content-hashed chunk names)
# cannot orphan a running server with ERR_MODULE_NOT_FOUND.
RUNDIR="$DIR/.tailnet-run"
ENTRY="$RUNDIR/server/index.mjs"
PIDFILE="$DIR/.tailnet.pid"
LOGFILE="$DIR/.tailnet.log"

# Load .env WITHOUT clobbering vars already in the environment (so a real
# CMUX_SOCKET_PATH from the shell wins over any placeholder in .env).
load_env() {
  [ -f "$DIR/.env" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in '' | \#*) continue ;; esac
    local key="${line%%=*}" val="${line#*=}"
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    [ -z "$key" ] && continue
    val="${val#\"}"
    val="${val%\"}"
    if [ -z "${!key:-}" ]; then
      export "$key=$val"
    fi
  done <"$DIR/.env"
}

running() {
  [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null
}

start() {
  if [ ! -f "$BUILD/server/index.mjs" ]; then
    echo "No build found. Run: pnpm build" >&2
    exit 1
  fi
  if running; then
    echo "Already running (pid $(cat "$PIDFILE")). Stop with: pnpm serve:tailnet:stop"
    exit 0
  fi
  load_env
  # Precedence: shell env > .env > default.
  local PORT="${PORT:-31337}" HOST="${HOST:-127.0.0.1}"
  if [ -z "${APP_PASSWORD:-}" ]; then
    echo "WARNING: APP_PASSWORD is not set. The app will be reachable on your"
    echo "         tailnet with NO login gate. Set APP_PASSWORD in .env first."
    echo "         Continuing in 3s (Ctrl-C to abort)..."
    sleep 3
  fi

  # Snapshot the current build so it is isolated from later rebuilds.
  rm -rf "$RUNDIR"
  mkdir -p "$RUNDIR"
  cp -R "$BUILD/." "$RUNDIR/"

  HOST="$HOST" PORT="$PORT" nohup node "$ENTRY" >"$LOGFILE" 2>&1 &
  echo $! >"$PIDFILE"
  sleep 2
  if ! running; then
    echo "Server failed to start. Last log lines:" >&2
    tail -n 20 "$LOGFILE" >&2
    rm -f "$PIDFILE"
    exit 1
  fi

  tailscale serve --bg "$PORT"
  echo ""
  echo "cmux-web is live on your tailnet:"
  tailscale serve status || true
  echo ""
  echo "Server pid $(cat "$PIDFILE") · logs: .tailnet.log"
  echo "Stop with: pnpm serve:tailnet:stop"
}

stop() {
  tailscale serve reset >/dev/null 2>&1 || true
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  pkill -f "$RUNDIR/server/index.mjs" 2>/dev/null || true
  rm -rf "$RUNDIR"
  echo "Stopped cmux-web and cleared tailscale serve."
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  *)
    echo "usage: tailnet.sh start|stop" >&2
    exit 1
    ;;
esac
