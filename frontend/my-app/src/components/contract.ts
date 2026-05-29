import { BrowserProvider, Contract, ContractTransactionResponse, isAddress, parseEther, solidityPackedKeccak256 } from "ethers";

const MANAGER_ADDRESS = import.meta.env.VITE_MANAGER_ADDRESS;
const QUT_TESTNET_CHAIN_ID = 452n;

// 2. ABIs generated directly from your Solidity source code
export const MANAGER_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "matchAddress", type: "address" },
      { indexed: false, internalType: "uint256", name: "index", type: "uint256" }
    ],
    name: "MatchCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "address", name: "matchAddress", type: "address" }
    ],
    name: "PlayerAssigned",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player1", type: "address" },
      { indexed: false, internalType: "address", name: "player2", type: "address" }
    ],
    name: "PlayersReturned",
    type: "event"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "activePlayer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "assignPlayer",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
    name: "getMatchAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getMatchCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isAuthorizedMatch",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "matches",
    outputs: [
      { internalType: "address", name: "matchAddress", type: "address" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "currentPlayers", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "player1", type: "address" },
      { internalType: "address", name: "player2", type: "address" }
    ],
    name: "notifyMatchEnded",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const MATCH_ABI = [
  {
    inputs: [{ internalType: "address", name: "_managerAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "escrowBalance", type: "uint256" }
    ],
    name: "EscrowDeposited",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: "address", name: "matchContract", type: "address" }],
    name: "LobbyInitialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "winner", type: "address" },
      { indexed: false, internalType: "uint256", name: "rewardAmount", type: "uint256" }
    ],
    name: "MatchResolved",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player1", type: "address" },
      { indexed: false, internalType: "address", name: "player2", type: "address" }
    ],
    name: "MatchStarted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: "address", name: "player", type: "address" }],
    name: "MoveCommitted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint8", name: "move", type: "uint8" }
    ],
    name: "MoveRevealed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [],
    name: "MovesReset",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "player1", type: "address" },
      { indexed: false, internalType: "address", name: "player2", type: "address" }
    ],
    name: "RoundDraw",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "winner", type: "address" },
      { indexed: false, internalType: "uint256", name: "player1Score", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "player2Score", type: "uint256" }
    ],
    name: "RoundWon",
    type: "event"
  },
  {
    inputs: [{ internalType: "bytes32", name: "_commitment", type: "bytes32" }],
    name: "CommitMove",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "CreateMatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "QueueCheck",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint8", name: "_move", type: "uint8" },
      { internalType: "bytes32", name: "_secret", type: "bytes32" }
    ],
    name: "RevealMove",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "WaitForMove",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_player", type: "address" }],
    name: "addToQueue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "depositEntryFee",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "player1",
    outputs: [
      { internalType: "address", name: "addr", type: "address" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint8", name: "move", type: "uint8" },
      { internalType: "bytes32", name: "commitment", type: "bytes32" },
      { internalType: "bool", name: "revealed", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "player2",
    outputs: [
      { internalType: "address", name: "addr", type: "address" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint8", name: "move", type: "uint8" },
      { internalType: "bytes32", name: "commitment", type: "bytes32" },
      { internalType: "bool", name: "revealed", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "status",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "ResolveTimeout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// 3. Shared connection helpers
async function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found. Install MetaMask and connect a wallet to continue.");
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const network = await provider.getNetwork();
  if (network.chainId !== QUT_TESTNET_CHAIN_ID) {
    throw new Error(
      "Wrong network selected. Switch MetaMask to QUT Testnet (chain ID 452) and try again."
    );
  }

  return await provider.getSigner();
}

async function assertContractCodeExists(address: string, label: string) {
  const signer = await getSigner();
  const provider = signer.provider;

  if (!provider) {
    throw new Error("Unable to access the connected blockchain provider.");
  }

  const code = await provider.getCode(address);
  if (code === "0x") {
    throw new Error(
      `No ${label} contract exists at ${address} on QUT Testnet. Update VITE_MANAGER_ADDRESS in Vercel after deploying the Manager contract, then redeploy the frontend.`
    );
  }

  return signer;
}

async function assertSignerIsMatchPlayer(matchAddress: string): Promise<Contract> {
  if (!isAddress(matchAddress)) {
    throw new Error(`Invalid Match contract address: ${matchAddress}.`);
  }

  const signer = await assertContractCodeExists(matchAddress, "Match");
  const signerAddress = (await signer.getAddress()).toLowerCase();
  const contract = new Contract(matchAddress, MATCH_ABI, signer);

  const [p1Struct, p2Struct] = await Promise.all([
    contract.player1(),
    contract.player2()
  ]);

  const p1 = String(p1Struct.addr).toLowerCase();
  const p2 = String(p2Struct.addr).toLowerCase();

  if (
    p1 === "0x0000000000000000000000000000000000000000" &&
    p2 === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "This match is no longer active. It may already have resolved on-chain. Return to matchmaking and join again."
    );
  }

  if (signerAddress !== p1 && signerAddress !== p2) {
    throw new Error(
      `Connected wallet ${signerAddress} is not a player in this match. Switch to the wallet used to join matchmaking.`
    );
  }

  return contract;
}

/**
 * Instantiates the main entry point contract on QUT Testnet.
 */
export async function getManagerContract(): Promise<Contract> {
  if (!MANAGER_ADDRESS) {
    throw new Error(
      "Missing VITE_MANAGER_ADDRESS. Set it to the Manager address deployed on QUT Testnet and rebuild the frontend."
    );
  }

  if (!isAddress(MANAGER_ADDRESS)) {
    throw new Error(`Invalid VITE_MANAGER_ADDRESS: ${MANAGER_ADDRESS}.`);
  }

  const signer = await assertContractCodeExists(MANAGER_ADDRESS, "Manager");
  return new Contract(MANAGER_ADDRESS, MANAGER_ABI, signer);
}

/**
 * Instantiates a Match contract dynamically using its address.
 */
export async function getMatchContract(matchAddress: string): Promise<Contract> {
  if (!isAddress(matchAddress)) {
    throw new Error(`Invalid Match contract address: ${matchAddress}.`);
  }

  const signer = await assertContractCodeExists(matchAddress, "Match");
  return new Contract(matchAddress, MATCH_ABI, signer);
}

// ==========================================
// MANAGER CONTRACT METHODS
// ==========================================

export interface AssignedMatchResult {
  matchAddress: string;
  playerAddress: string;
  transactionHash: string;
}

/**
 * Joins matchmaking and returns the assigned Match address from the confirmed
 * transaction receipt. Reading the receipt avoids missing a live event when a
 * wallet is first connected or when MatchStarted fires in the same transaction.
 */
export async function assignPlayer(): Promise<AssignedMatchResult> {
  const contract = await getManagerContract();
  const signer = await getSigner();
  const playerAddress = (await signer.getAddress()).toLowerCase();

  const tx: ContractTransactionResponse = await contract.assignPlayer({
    value: parseEther("0.001"),
    gasLimit: 500000
  });

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("The matchmaking transaction was not confirmed.");
  }

  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog?.name === "PlayerAssigned") {
        return {
          matchAddress: String(parsedLog.args.matchAddress).toLowerCase(),
          playerAddress,
          transactionHash: tx.hash
        };
      }
    } catch {
      // The transaction also contains events from the assigned Match contract.
    }
  }

  throw new Error(
    "Transaction confirmed but no PlayerAssigned event was found. Confirm the configured Manager address is the QUT Testnet deployment."
  );
}

/**
 * Inspects if an address is currently tied up in an active game profile.
 */
export async function isActivePlayer(playerAddress: string): Promise<boolean> {
  const contract = await getManagerContract();
  return (await contract.activePlayer(playerAddress)) as boolean;
}

// ==========================================
// MATCH CONTRACT METHODS
// ==========================================

/**
 * Submits the hash commitment of a choice (Rock, Paper, or Scissors).
 */
export async function commitMove(matchAddress: string, commitment: string): Promise<void> {
  const contract = await assertSignerIsMatchPlayer(matchAddress);
  const tx: ContractTransactionResponse = await contract.CommitMove(commitment);
  await tx.wait();
}

/**
 * Reveals a previously committed choice by providing the matching move and secret.
 */
export async function revealMove(matchAddress: string, move: number, secret: string): Promise<void> {
  const contract = await assertSignerIsMatchPlayer(matchAddress);
  const tx: ContractTransactionResponse = await contract.RevealMove(move, secret);
  await tx.wait();
}

/**
 * Generates the same commitment hash that Match.sol validates on reveal.
 */
export function generateCommitment(move: number, secret: string, playerAddress: string): string {
  return solidityPackedKeccak256(["uint8", "bytes32", "address"], [move, secret, playerAddress]);
}
