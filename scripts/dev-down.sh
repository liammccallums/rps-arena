#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-dev"
HARDHAT_PID_FILE="$RUN_DIR/hardhat.pid"
VITE_PID_FILE="$RUN_DIR/vite.pid"

stop_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"

    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Stopping $name (PID $pid)..."
      kill "$pid" >/dev/null 2>&1 || true
    else
      echo "$name PID file found, but process is not running."
    fi

    rm -f "$pid_file"
  else
    echo "$name is not running (no PID file)."
  fi
}

stop_pid_file "Hardhat" "$HARDHAT_PID_FILE"
stop_pid_file "Vite" "$VITE_PID_FILE"

# Fallback cleanup for orphan processes started manually.
pkill -f "hardhat node" >/dev/null 2>&1 || true
pkill -f "vite --host 127.0.0.1 --port 5173" >/dev/null 2>&1 || true

echo "Local environment stopped."
