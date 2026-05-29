import { BrowserProvider, Contract, ContractTransactionReceipt, ContractTransactionResponse, Interface, isAddress, parseEther, solidityPackedKeccak256 } from "ethers";

const DEFAULT_MANAGER_ADDRESS = "0xaF6999cF9b9012e5de9413001A65D42488E2Eb0f";
const MANAGER_ADDRESS = import.meta.env.VITE_MANAGER_ADDRESS ?? DEFAULT_MANAGER_ADDRESS;
const SUPPORTED_NETWORKS = new Map<bigint, string>([
  [31337n, "Hardhat Local"],
  [452n, "QUT Testnet"],
]);
const INVALID_MANAGER_ADDRESS_MESSAGE =
  "Invalid VITE_MANAGER_ADDRESS in frontend env configuration. frontend/my-app/.env.local must contain the deployed Manager contract address, and Vite must be restarted after changing env values.";

export const ACTIVE_MANAGER_ADDRESS = MANAGER_ADDRESS;

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

const managerInterface = new Interface(MANAGER_ABI);

// 3. Shared connection helpers
async function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const network = await provider.getNetwork();

  if (!SUPPORTED_NETWORKS.has(network.chainId)) {
    throw new Error(
      `Wrong network selected. Please switch MetaMask to ${Array.from(SUPPORTED_NETWORKS.values()).join(" or ")} before playing.`
    );
  }

  return await provider.getSigner();
}

async function assertSignerIsMatchPlayer(matchAddress: string): Promise<Contract> {
  const signer = await getSigner();
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
      "This match is no longer active (player slots were reset). It likely already resolved on-chain. Refresh both tabs and rejoin matchmaking."
    );
  }

  if (signerAddress !== p1 && signerAddress !== p2) {
    throw new Error(
      `Connected wallet ${signerAddress} is not a player in this match. Expected ${p1} or ${p2}. Switch MetaMask account for this browser profile and try again.`
    );
  }

  return contract;
}

/**
 * Instantiates the main entry point contract.
 */
export async function getManagerContract(): Promise<Contract> {
  if (!MANAGER_ADDRESS) {
    throw new Error("Missing VITE_MANAGER_ADDRESS in frontend env configuration");
  }

  if (!isAddress(MANAGER_ADDRESS)) {
    throw new Error(INVALID_MANAGER_ADDRESS_MESSAGE);
  }

  const signer = await getSigner();
  return new Contract(MANAGER_ADDRESS, MANAGER_ABI, signer);
}

/**
 * Instantiates a Match contract dynamically using its address.
 */
export async function getMatchContract(matchAddress: string): Promise<Contract> {
  const signer = await getSigner();
  return new Contract(matchAddress, MATCH_ABI, signer);
}

// ==========================================
// MANAGER CONTRACT METHODS
// ==========================================

/**
 * Joins matchmaking pool by executing assignPlayer and sending the required 0.001 ETH entry fee.
 */
export async function assignPlayer(): Promise<ContractTransactionResponse> {
  const contract = await getManagerContract();
  const tx = await contract.assignPlayer({ value: parseEther("0.001"), gasLimit: 500000 });
  return tx as ContractTransactionResponse;
}

export function getAssignedMatchFromReceipt(
  receipt: ContractTransactionReceipt
): { playerAddress: string; matchAddress: string } | null {

  for (const log of receipt.logs) {
    try {
      const parsedLog = managerInterface.parseLog(log);

      if (parsedLog?.name !== "PlayerAssigned") {
        continue;
      }

      return {
        playerAddress: String(parsedLog.args.player).toLowerCase(),
        matchAddress: String(parsedLog.args.matchAddress).toLowerCase(),
      };
    } catch {
      continue;
    }
  }

  return null;
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
 * @param matchAddress The contract location for the specific ongoing match
 * @param commitment The keccak256 hash output string
 */
export async function commitMove(matchAddress: string, commitment: string): Promise<void> {
  const contract = await assertSignerIsMatchPlayer(matchAddress);
  const tx: ContractTransactionResponse = await contract.CommitMove(commitment);
  await tx.wait();
}

/**
 * Reveals a previously committed choice by providing the matching plain text elements.
 * @param matchAddress The contract location for the specific ongoing match
 * @param move Enum index (1 = Rock, 2 = Paper, 3 = Scissors)
 * @param secret Unique salt string used when structuring the initial commitment
 */
export async function revealMove(matchAddress: string, move: number, secret: string): Promise<void> {
  const contract = await assertSignerIsMatchPlayer(matchAddress);
  const tx: ContractTransactionResponse = await contract.RevealMove(move, secret);
  await tx.wait();
}

/**
 * Generates a keccak256 hash of the player's chosen move and a secret string.
 * This hash is used for committing a move in the game.
 * @param move The player's chosen move (e.g., 1 for Rock, 2 for Paper, 3 for Scissors).
 * @param secret A bytes32 random salt.
 * @param playerAddress The player's wallet address.
 * @returns The keccak256 hash as a bytes32 string.
 */
export function generateCommitment(move: number, secret: string, playerAddress: string): string {
  return solidityPackedKeccak256(["uint8", "bytes32", "address"], [move, secret, playerAddress]);
}