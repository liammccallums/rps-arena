# RPS Arena
### A Blockchain‑Powered Rock‑Paper‑Scissors Trading Card Game

## Project Structure

- blockchain/: Solidity smart contracts, Hardhat config, scripts, and test suite.
- frontend/: Placeholder for the future React frontend application.

RPS Arena is a competitive, turn‑based Rock‑Paper‑Scissors game built on blockchain technology.  
Players use ERC‑1155 cards and power‑ups, commit to hidden moves, reveal them later, and battle in best‑of‑3 matches.  
All items are real on‑chain assets that players fully own and can trade.

---

## 🃏 1. Card Types

### **Base Cards**
- Rock  
- Paper  
- Scissors  

Base cards are **ERC‑1155 tokens** that represent the player’s moves during a round.  
They are **never burned**, always available, and every player receives a starter set.

### **Power‑Ups**
Single‑use ERC‑1155 items that modify the outcome of a round.  
Examples:
- **Rock Booster** – Rock beats Paper once  
- **Paper Shield** – Paper cannot lose this round  
- **Nullify** – Cancels your opponent’s power‑up for the round  

Power‑ups are:
- Earned from match rewards  
- Burned when used  
- Fully tradeable  

---

## ⭐ 2. Card Tiers

Base cards come in increasing tiers of strength.

### **Tier 1 — Starter Tier**
- Given to all players  
- Baseline strength  
- Never burned  

### **Tier 2 — Rare Tier**
- Earned through match rewards  
- **Stronger in same‑type matchups**  
  - Example: Tier 2 Rock beats Tier 1 Rock  
- Type advantage still applies  
  - Paper still beats Rock, even if Rock is Tier 3

### **Tier 3 — Epic Tier (Optional Future Expansion)**
- Highly rare  
- Strongest version of each type  

### 📌 Tier Rules Summary
- Tiers only matter **when both players pick the same type**.  
- Tiers never override the core RPS triangle (Rock > Scissors > Paper > Rock).

---

## 🎒 3. Player Loadout

Before each match, a player selects:
- **Three base cards** (usually Rock, Paper, Scissors, or higher‑tier versions)  
- **One optional power‑up** (burned if used)

Loadout choices add strategy:
- Use your tiered card early or save it for Round 3?  
- Bring a power‑up or go in clean?  
- Predict your opponent’s tendencies?

---

## 🕹️ 4. Match Flow (Best‑of‑3)

Each match has up to **three rounds**.  
First to **two wins** takes the match.

### **Step 1 — Commit Phase**
Both players secretly choose:
- Move (Rock/Paper/Scissors)  
- Card tier  
- Whether they will use their power‑up  

They submit a **hashed commitment** containing all choices + a random nonce.  
This hides the move from the opponent.

### **Step 2 — Reveal Phase**
Players reveal:
- The move  
- The selected card  
- The nonce  

The system verifies the reveal matches the earlier commitment.

### **Step 3 — Resolution**
The smart contract:
- Applies standard RPS rules  
- Compares tier strengths  
- Applies any active power‑ups  
- Determines the winner of the round  
- Burns used power‑ups  
- Updates match score  

If a player reaches 2 wins, the match ends.

---

## 🏆 5. Rewards

Winning a match grants a chance to receive:
- **New power‑ups** (common)  
- **Higher‑tier base cards** (rare)  

Rewards are minted directly to the player’s wallet as ERC‑1155 items.  
They can be kept, traded, or used in future matches.

---

## 🔄 6. Trading

All items (cards and power‑ups) are ERC‑1155 tokens and can be traded using:
- Wallet‑to‑wallet transfers  
- A trustless on‑chain marketplace (optional module)  

Trading uses the standard `safeTransferFrom` function.

---

## 🔧 7. Technology Overview

- **ERC‑1155 Items Contract:** 
  Stores all cards and power‑ups; enables minting, burning, and transfers.

- **Matchmaker Contract:**  
  Manages commit–reveal, match state, round resolution, and rewards.

- **Optional Rules Module:**  
  Pure functions handling RPS logic, tiers, and power‑ups.

- **Optional Rewards Module:**  
  Handles drop tables and mints new items.

- **Optional Marketplace:**  
  Peer‑to‑peer trading of ERC‑1155 items.

---

## 📘 8. Summary

RPS Arena brings a strategic, collectible layer to classic Rock‑Paper‑Scissors.  
Players build loadouts, use powerful consumables, earn rare cards, and battle in a fully decentralised, tamper‑proof environment.  
All items are real blockchain assets, owned permanently and tradable by players.

---
