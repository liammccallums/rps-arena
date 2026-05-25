# RPS Arena
### A Blockchain-Powered Commit-Reveal Rock-Paper-Scissors dApp

## Project Structure

- blockchain/: Solidity smart contracts, Hardhat config, scripts, and test suite.
- frontend/: React + Vite frontend used to join matches and play rounds through MetaMask.

## Local Test Environment (Quick Runbook)

### Quick Start (Recommended)

From the repository root, start everything with one command:

```bash
./scripts/dev-up.sh
```

Stop everything with one command:

```bash
./scripts/dev-down.sh
```

`dev-up.sh` will:
- start a local Hardhat node
- deploy `Manager` to localhost
- write `frontend/my-app/.env.local` with `VITE_MANAGER_ADDRESS`
- start the Vite frontend

Open the app at `http://127.0.0.1:5173`.

### Add Hardhat Localhost to MetaMask

Before playing, connect MetaMask to the local Hardhat chain.

In MetaMask:
1) Open the network selector -> `Add network` -> `Add a network manually`.
2) Enter:
  - Network Name: `Hardhat Local`
  - New RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency Symbol: `ETH`
3) Save, then switch MetaMask to `Hardhat Local`.

### Import a Hardhat Test Wallet into MetaMask

When `npx hardhat node` starts, it prints funded test accounts and private keys.

To import one account:
1) Copy one private key from the `Private Keys` section in the Hardhat terminal.
2) In MetaMask, click account menu -> `Add account or hardware wallet` -> `Import account`.
3) Paste the private key and confirm.
4) Keep MetaMask on the `Hardhat Local` network.

### Manual Setup (Optional)

Use this only if you want to run each component yourself.

1) Start blockchain (Terminal 1)

```bash
cd blockchain
npx hardhat node
```

2) Deploy manager (Terminal 2)

```bash
cd blockchain
npx hardhat run scripts/deploy-manager-local.ts --network localhost
```

3) Set frontend env (Terminal 2)

```bash
cd frontend/my-app
echo "VITE_MANAGER_ADDRESS=<PASTE_MANAGER_ADDRESS_HERE>" > .env.local
```

4) Start frontend (Terminal 3)

```bash
cd frontend/my-app
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## Current Implementation

RPS Arena currently implements an on-chain, 1v1 commit-reveal Rock-Paper-Scissors game with escrowed entry fees.

What is live right now:
- A Manager contract deploys and manages a fixed pool of 3 Match contracts.
- Players join by calling `assignPlayer` with exactly `0.001 ETH`.
- The manager routes players into available lobbies and auto-starts a match when 2 players are assigned.
- Each match is best-of-3 (first to 2 round wins).
- Round play uses commit-reveal:
  - Commit: each player submits a hash of `(move, secret, playerAddress)`.
  - Reveal: each player submits `(move, secret)`; contract verifies against the commitment.
- Escrow payout:
  - Both entry fees are held in match escrow.
  - Winner receives the full escrow when reaching 2 round wins.
- Timeout handling:
  - 5-minute timeout window per move/reveal stage.
  - Players can call `ResolveTimeout` to progress stalled rounds.

## Smart Contracts (Implemented)

### Manager.sol
- Initializes and owns a pool of Match contracts.
- Enforces entry fee (`0.001 ETH`) and active player guard (prevents double-queueing).
- Assigns players to matches and tracks active player status.
- Receives match-end notifications and returns players to idle state.

### Match.sol
- Handles lobby state, player queue, and game status transitions.
- Records commitments and validates reveals.
- Resolves round outcomes and score progression.
- Supports timeout-based round resolution.
- Pays escrow to winner and notifies manager when a match ends.

## Frontend Behavior (Implemented)

The React/Vite frontend:
- Connects with MetaMask.
- Reads manager address from `frontend/my-app/.env.local` via `VITE_MANAGER_ADDRESS`.
- Lets players:
  - Join queue (`assignPlayer` with 0.001 ETH).
  - Commit a move.
  - Reveal a move.
  - Resolve timeout when needed.
- Uses safeguards to ensure the connected wallet is one of the two active match players before commit/reveal.

## Gameplay Flow (Implemented)

1. Player A and Player B each join queue with 0.001 ETH.
2. Manager assigns both players to the same Match contract.
3. Match starts and waits for committed hashes from both players.
4. Both players reveal move + secret.
5. Contract judges the round, updates score, and resets for next round.
6. First player to 2 wins receives escrow payout.
7. Match resets to matchmaking state for future players.

## Future Extensions (Not Yet Implemented)

The ideas below are planned concepts and are not currently part of the deployed gameplay in this repository.

### Tokenized Cards and Power-Ups
- ERC-1155 base cards (Rock, Paper, Scissors) as inventory items.
- Single-use ERC-1155 power-ups that can modify round outcomes.
- Optional tiered card strength model for same-type matchups.

### Rewards and Progression
- Match rewards (for example, power-up drops or higher-tier cards).
- On-chain mint/burn mechanics tied to match outcomes.

### Trading Layer
- Wallet-to-wallet trading of cards/power-ups.
- Optional marketplace module for peer-to-peer listings and settlement.

### Extended Game Modules
- Dedicated rules module for power-up/tier interactions.
- Dedicated rewards/drop-table module for progression balancing.

## Troubleshooting and Reset

### Script command not found

If `dev-up.sh` or `dev-down.sh` says command not found, run with a path from repo root:

```bash
./scripts/dev-up.sh
./scripts/dev-down.sh
```

If needed, make scripts executable once:

```bash
chmod +x scripts/dev-up.sh scripts/dev-down.sh
```

### Full local reset

```bash
./scripts/dev-down.sh || true
pkill -f "hardhat node" || true
pkill -f "vite --host 127.0.0.1 --port 5173" || true
./scripts/dev-up.sh
```

### "Player already active" when joining

This means the address is still marked active in the current local chain state.

Fix options:
- Finish/resolve the current match for that player.
- Use a different local account in MetaMask.
- Run the full local reset above.

---
