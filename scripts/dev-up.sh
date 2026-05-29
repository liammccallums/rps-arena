#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-dev"
VITE_PID_FILE="$RUN_DIR/vite.pid"
VITE_LOG="$RUN_DIR/vite.log"

mkdir -p "$RUN_DIR"

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

run_deploy_and_set_env() {
  echo "Deploying Manager directly to the live QUT Testnet..."
  local deploy_output
  
  # CHANGED: Changed --network from localhost to qutTestnet
  deploy_output="$(cd "$ROOT_DIR/blockchain" && npx hardhat run scripts/deploy-manager-local.ts --network qutTestnet)"
  echo "$deploy_output"

  local manager_address
  manager_address="$(echo "$deploy_output" | sed -n 's/^MANAGER_ADDRESS=//p' | tail -n 1)"

  if [[ -z "$manager_address" ]]; then
    echo "Could not parse MANAGER_ADDRESS from deploy output."
    exit 1
  fi

  echo "Writing frontend env with QUT manager address..."
  printf 'VITE_MANAGER_ADDRESS=%s\n' "$manager_address" > "$ROOT_DIR/frontend/my-app/.env.local"
}

start_vite() {
  if [[ -f "$VITE_PID_FILE" ]] && is_running "$(cat "$VITE_PID_FILE")"; then
    echo "Vite is already running (PID $(cat "$VITE_PID_FILE"))."
    return
  fi

  echo "Starting Vite dev server for Wi-Fi testing..."
  (
    cd "$ROOT_DIR/frontend/my-app"
    # Keeping the host flag intact so friends on your Wi-Fi can still load your frontend UI
    nohup npm run dev -- --host 172.20.10.6 --port 5173 >"$VITE_LOG" 2>&1 &
    echo $! >"$VITE_PID_FILE"
  )

  echo "Vite started."
}

# PIPELINE: Completely removed 'start_hardhat' because the QUT Testnet is already running in the cloud!
run_deploy_and_set_env
start_vite

echo ""
echo "QUT Testnet Environment is Live."
echo "Frontend App URL (Share with Wi-Fi peers): http://172.20.10.6:5173"
echo "Vite log:    $VITE_LOG"