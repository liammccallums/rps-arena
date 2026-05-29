#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-dev"
VITE_PID_FILE="$RUN_DIR/vite.pid"
VITE_LOG="$RUN_DIR/vite.log"
FRONTEND_ENV="$ROOT_DIR/frontend/my-app/.env.local"

mkdir -p "$RUN_DIR"

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

deploy_manager_and_set_env() {
  if [[ -z "${QUT_TESTNET_PRIVATE_KEY:-}" ]]; then
    echo "QUT_TESTNET_PRIVATE_KEY is required when deploying a new Manager."
    echo 'Run: export QUT_TESTNET_PRIVATE_KEY="0xYOUR_TESTNET_PRIVATE_KEY"'
    exit 1
  fi

  echo "Deploying a new Manager to QUT Testnet..."
  local deploy_output
  deploy_output="$(cd "$ROOT_DIR/blockchain" && npx hardhat run scripts/deploy-manager-local.ts --network qutTestnet)"
  echo "$deploy_output"

  local manager_address
  manager_address="$(echo "$deploy_output" | sed -n 's/^MANAGER_ADDRESS=//p' | tail -n 1)"

  if [[ -z "$manager_address" ]]; then
    echo "Could not parse MANAGER_ADDRESS from deploy output."
    exit 1
  fi

  printf 'VITE_MANAGER_ADDRESS=%s\n' "$manager_address" > "$FRONTEND_ENV"
  echo "Wrote new QUT Manager address to frontend/my-app/.env.local."
  echo "For Vercel, set VITE_MANAGER_ADDRESS=$manager_address and trigger a new deployment."
}

require_existing_manager_env() {
  if [[ ! -f "$FRONTEND_ENV" ]] || ! grep -q '^VITE_MANAGER_ADDRESS=0x' "$FRONTEND_ENV"; then
    echo "No local Manager address has been configured."
    echo "Either create frontend/my-app/.env.local with VITE_MANAGER_ADDRESS=<QUT_MANAGER_ADDRESS>"
    echo "or deliberately deploy a new Manager with: ./scripts/dev-up.sh --deploy"
    exit 1
  fi

  echo "Using existing Manager address from frontend/my-app/.env.local."
  echo "A new QUT Testnet contract will NOT be deployed."
}

start_vite() {
  if [[ -f "$VITE_PID_FILE" ]] && is_running "$(cat "$VITE_PID_FILE")"; then
    echo "Vite is already running (PID $(cat "$VITE_PID_FILE"))."
    return
  fi

  echo "Starting Vite dev server..."
  (
    cd "$ROOT_DIR/frontend/my-app"
    nohup npm run dev -- --host 0.0.0.0 --port 5173 >"$VITE_LOG" 2>&1 &
    echo $! >"$VITE_PID_FILE"
  )

  echo "Vite started."
}

if [[ "${1:-}" == "--deploy" ]]; then
  deploy_manager_and_set_env
else
  require_existing_manager_env
fi

start_vite

echo ""
echo "QUT Testnet frontend is running."
echo "Local URL: http://localhost:5173"
echo "Vite log: $VITE_LOG"
