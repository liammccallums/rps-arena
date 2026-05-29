#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-dev"
HARDHAT_PID_FILE="$RUN_DIR/hardhat.pid"
VITE_PID_FILE="$RUN_DIR/vite.pid"
HARDHAT_LOG="$RUN_DIR/hardhat.log"
VITE_LOG="$RUN_DIR/vite.log"

mkdir -p "$RUN_DIR"

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

start_hardhat() {
  if [[ -f "$HARDHAT_PID_FILE" ]] && is_running "$(cat "$HARDHAT_PID_FILE")"; then
    echo "Hardhat node is already running (PID $(cat "$HARDHAT_PID_FILE"))."
    return
  fi

  echo "Starting Hardhat node..."
  (
    cd "$ROOT_DIR/blockchain"
    nohup npx hardhat node >"$HARDHAT_LOG" 2>&1 &
    echo $! >"$HARDHAT_PID_FILE"
  )

  echo "Waiting for Hardhat RPC (127.0.0.1:8545)..."
  for _ in {1..30}; do
    if curl -s -X POST http://127.0.0.1:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      >/dev/null 2>&1; then
      echo "Hardhat is up."
      return
    fi
    sleep 1
  done

  echo "Hardhat did not become ready in time. Check $HARDHAT_LOG"
  exit 1
}

run_deploy_and_set_env() {
  echo "Deploying Manager to localhost..."
  local deploy_output
  deploy_output="$(cd "$ROOT_DIR/blockchain" && npx hardhat run scripts/deploy-manager-local.ts --network localhost)"
  echo "$deploy_output"

  local manager_address
  manager_address="$(echo "$deploy_output" | sed -n 's/^MANAGER_ADDRESS=//p' | tail -n 1)"

  if [[ -z "$manager_address" ]]; then
    echo "Could not parse MANAGER_ADDRESS from deploy output."
    exit 1
  fi

  echo "Writing frontend env with manager address..."
  printf 'VITE_MANAGER_ADDRESS=%s\n' "$manager_address" > "$ROOT_DIR/frontend/my-app/.env.local"
}

start_vite() {
  if [[ -f "$VITE_PID_FILE" ]] && is_running "$(cat "$VITE_PID_FILE")"; then
    echo "Vite is already running (PID $(cat "$VITE_PID_FILE"))."
    return
  fi

  echo "Starting Vite dev server..."
  (
    cd "$ROOT_DIR/frontend/my-app"
    nohup npm run dev -- --host 127.0.0.1 --port 5173 >"$VITE_LOG" 2>&1 &
    echo $! >"$VITE_PID_FILE"
  )

  echo "Vite started."
}

start_hardhat
run_deploy_and_set_env
start_vite

echo ""
echo "Local environment is ready."
echo "App URL: http://127.0.0.1:5173"
echo "Hardhat log: $HARDHAT_LOG"
echo "Vite log:    $VITE_LOG"
echo "Use ./scripts/dev-down.sh to stop everything."
