# RPS Arena — QUT Testnet Build

## Required QUT Testnet deployment setup

This version is configured for the QUT Testnet and fixes the frontend state issue caused by relying only on live event listeners. When a player joins, the frontend now reads the `PlayerAssigned` event from the confirmed transaction receipt, stores the assigned Match address in React state, and then checks the on-chain match status. This allows both players to progress even when `MatchStarted` fires before the browser listener is attached.

### 1. MetaMask network

Add and select the following network in each test browser profile:

```text
Network Name: QUT Testnet
RPC URL:      https://testnet.qutblockchain.club
Chain ID:     452
Currency:     ETH
```

### 2. Deploy one Manager contract to QUT Testnet

Use a fresh testnet-only wallet. Do not place private keys in source files.

```bash
cd blockchain
npm install
export QUT_TESTNET_PRIVATE_KEY="0xYOUR_QUT_TESTNET_PRIVATE_KEY"
npx hardhat run scripts/deploy-manager-local.ts --network qutTestnet
```

Copy the `MANAGER_ADDRESS=0x...` output. The Manager constructor deploys its three Match contracts automatically. Do not redeploy the Manager for every frontend restart, because every new deployment produces a different frontend address.

### 3. Configure the frontend locally

```bash
cd ../frontend/my-app
printf 'VITE_MANAGER_ADDRESS=%s\n' '0xYOUR_QUT_MANAGER_ADDRESS' > .env.local
npm install
npm run dev
```

The frontend refuses to send the entry fee unless MetaMask is on chain ID `452` and bytecode exists at the configured Manager address on that chain.

### 4. Configure Vercel

In the Vercel project settings, create or update this environment variable for the environments you use:

```text
VITE_MANAGER_ADDRESS=0xYOUR_QUT_MANAGER_ADDRESS
```

Trigger a new deployment after changing the value. The deployed website must be rebuilt to receive a new Vite environment value.

### 5. Optional local convenience script

Start the frontend with an existing `.env.local` address:

```bash
./scripts/dev-up.sh
```

Only when you intentionally want a new QUT Testnet contract deployment:

```bash
export QUT_TESTNET_PRIVATE_KEY="0xYOUR_QUT_TESTNET_PRIVATE_KEY"
./scripts/dev-up.sh --deploy
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
