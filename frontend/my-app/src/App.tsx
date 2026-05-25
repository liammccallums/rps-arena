import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Heading, Text, Spinner } from '@chakra-ui/react';
import { getManagerContract, getMatchContract } from './components/contract';
import { Contract } from 'ethers';

// Sub-components
import JoinQueue from './components/JoinQueue';
import PickMove from './components/PickMove';
import RevealResult from './components/RevealResult';
import GameOver from './components/GameOver';

// --- Types & Interfaces ---
export type ScreenState = 'JOIN' | 'WAITING_FOR_MATCH' | 'PICK' | 'WAITING_FOR_REVEAL' | 'REVEAL_PHASE' | 'GAME_OVER';
export type MatchResult = 'WIN' | 'LOSS' | 'DRAW' | '';

export interface Scores {
  player: number;
  opponent: number;
}

export interface RoundData {
  playerMove: number;
  opponentMove: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
}

export default function App() {
  // Screens & Navigation
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('JOIN');
  const [screenMessage, setScreenMessage] = useState<string>('');
  
  // Dynamic Web3 State
  const [playerAddress, setPlayerAddress] = useState<string>('');
  const [matchAddress, setMatchAddress] = useState<string>('');

  // Game Engine State
  const [scores, setScores] = useState<Scores>({ player: 0, opponent: 0 });
  const [lastRound, setLastRound] = useState<RoundData | null>(null);
  const [finalResult, setFinalResult] = useState<'WIN' | 'LOSS'>('LOSS');

  // Using refs to prevent stale closures inside global event callback loops
  const stateRef = useRef({ playerAddress, matchAddress });
  useEffect(() => {
    stateRef.current = { playerAddress, matchAddress };
  }, [playerAddress, matchAddress]);

  // ==========================================
  // WEB3 & INITIAL SETUP
  // ==========================================
  useEffect(() => {
    async function initWallet() {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            setPlayerAddress(accounts[0].toLowerCase());
          }
          
          // Listen for active wallet account profile swaps
          window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
            if (newAccounts.length > 0) {
              setPlayerAddress(newAccounts[0].toLowerCase());
              handleReset();
            } else {
              setPlayerAddress('');
              setCurrentScreen('JOIN');
            }
          });
        } catch (err) {
          console.error("Could not pull initial wallet address account: ", err);
        }
      }
    }
    initWallet();
  }, []);

  // ==========================================
  // GLOBAL CONTRACT EVENT LISTENERS
  // ==========================================
  useEffect(() => {
    let managerContract: Contract | null = null;
    let matchContract: Contract | null = null;

    async function configureListeners() {
      if (!playerAddress) return;

      try {
        managerContract = await getManagerContract();

        // 1. Listen for our player getting assigned to a match instance lobby room
        managerContract.on('PlayerAssigned', (assignedPlayer: string, roomAddress: string) => {
          if (assignedPlayer.toLowerCase() === stateRef.current.playerAddress) {
            setMatchAddress(roomAddress.toLowerCase());
            setCurrentScreen('WAITING_FOR_MATCH');
            setScreenMessage('Assigned to game lobby! Waiting for a challenger...');
          }
        });

        // If we already have an active match address assigned, bind structural internal game loop events
        if (matchAddress) {
          matchContract = await getMatchContract(matchAddress);

          // If MatchStarted fired before we attached listeners, recover from state.
          const status = Number(await matchContract.status());
          if (status === 3) {
            const p1Struct = await matchContract.player1();
            const p2Struct = await matchContract.player2();
            const opp = p1Struct.addr.toLowerCase() === stateRef.current.playerAddress
              ? p2Struct.addr.toLowerCase()
              : p1Struct.addr.toLowerCase();

            if (opp) {
              setCurrentScreen('PICK');
              setScreenMessage('');
            }
          }

          // 2. Both players found! Game starts
          matchContract.on('MatchStarted', (_p1: string, _p2: string) => {
            setCurrentScreen('PICK');
            setScreenMessage('');
          });

          // 3. Move Committed
          matchContract.on('MoveCommitted', (committer: string) => {
            // If the sender was us, push screen to wait for the other side
            if (committer.toLowerCase() === stateRef.current.playerAddress) {
              setCurrentScreen('WAITING_FOR_REVEAL');
              setScreenMessage('Move recorded on-chain! Waiting for opponent to commit...');
            }
          });

          // 4. Round concluded with a clear victor
          matchContract.on('RoundWon', (winnerAddress: string, p1Score: bigint, p2Score: bigint) => {
            handleRoundResolution(winnerAddress, p1Score, p2Score);
          });

          // 5. Round tied
          matchContract.on('RoundDraw', () => {
            const localSavedMove = localStorage.getItem(`match_${stateRef.current.matchAddress}_move`);
            const playedMove = localSavedMove ? parseInt(localSavedMove, 10) : 0;
            
            setLastRound({
              playerMove: playedMove,
              opponentMove: playedMove, // On a tie, opponent played the identical item index
              result: 'DRAW'
            });
            setCurrentScreen('REVEAL_PHASE');
          });

          // 6. Complete Match Terminated
          matchContract.on('MatchResolved', (grandWinner: string) => {
            setFinalResult(grandWinner.toLowerCase() === stateRef.current.playerAddress ? 'WIN' : 'LOSS');
            setCurrentScreen('GAME_OVER');
          });
        }
      } catch (err) {
        console.error("Error configuring smart contract listeners:", err);
      }
    }

    configureListeners();

    // Clean up connections on unmount or updates to avoid memory leaks and duplicate listeners
    return () => {
      if (managerContract) managerContract.removeAllListeners('PlayerAssigned');
      if (matchContract) {
        matchContract.removeAllListeners('MatchStarted');
        matchContract.removeAllListeners('MoveCommitted');
        matchContract.removeAllListeners('RoundWon');
        matchContract.removeAllListeners('RoundDraw');
        matchContract.removeAllListeners('MatchResolved');
      }
    };
  }, [playerAddress, matchAddress]);

  // ==========================================
  // PARSING LOGIC HELPERS
  // ==========================================
  const handleRoundResolution = async (winnerAddress: string, p1Score: bigint, p2Score: bigint) => {
    try {
      const activeRoom = await getMatchContract(stateRef.current.matchAddress);
      
      // Pull player identities from contract state to correlate scores accurately
      const p1Struct = await activeRoom.player1();
      
      const isPlayerP1 = p1Struct.addr.toLowerCase() === stateRef.current.playerAddress;
      
      const playerCurrentScore = Number(isPlayerP1 ? p1Score : p2Score);
      const opponentCurrentScore = Number(isPlayerP1 ? p2Score : p1Score);
      
      // Pull local move storage references
      const localSavedMove = localStorage.getItem(`match_${stateRef.current.matchAddress}_move`);
      const playerChoice = localSavedMove ? parseInt(localSavedMove, 10) : 0;
      
      // Determine what the opponent played using inverse modular logic based on who won the round
      let opponentChoice = playerChoice;
      const amIWinner = winnerAddress.toLowerCase() === stateRef.current.playerAddress;
      
      if (!amIWinner) {
        // Opponent won: find the item index that beats player choice
        opponentChoice = playerChoice === 3 ? 1 : playerChoice + 1;
      } else {
        // Player won: opponent played the choice beaten by player choice
        opponentChoice = playerChoice === 1 ? 3 : playerChoice - 1;
      }

      setScores({ player: playerCurrentScore, opponent: opponentCurrentScore });
      setLastRound({
        playerMove: playerChoice,
        opponentMove: opponentChoice,
        result: amIWinner ? 'WIN' : 'LOSS'
      });

      setCurrentScreen('REVEAL_PHASE');
    } catch (err) {
      console.error("Failed to parse on-chain round outcomes: ", err);
    }
  };

  const handleNextRoundReady = () => {
    // Clear storage references for the old round and move on
    localStorage.removeItem(`match_${matchAddress}_move`);
    localStorage.removeItem(`match_${matchAddress}_secret`);
    setLastRound(null);
    setCurrentScreen('PICK');
    setScreenMessage('');
  };

  const handleReset = (): void => {
    setScores({ player: 0, opponent: 0 });
    setMatchAddress('');
    setLastRound(null);
    setCurrentScreen('JOIN');
    setScreenMessage('');
  };

  return (
    <Flex direction="column" align="center" justify="center" minH="100vh" bg="gray.900" color="white" p={4}>
      <Box as="header" mb={8} textAlign="center">
        <Heading as="h1" size="2xl" mb={2} bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text">
          RPS Arena
        </Heading>
        {playerAddress && (
          <Text fontSize="xs" color="gray.500" mb={4}>
            Connected Account: {playerAddress.slice(0, 6)}...{playerAddress.slice(-4)}
          </Text>
        )}
        <Flex gap={6} justify="center" bg="gray.800" p={3} borderRadius="md" border="1px solid" borderColor="gray.700">
          <Text fontWeight="semibold" color="blue.300">Player Score: {scores.player}</Text>
          <Text fontWeight="semibold" color="red.300">Opponent Score: {scores.opponent}</Text>
        </Flex>
      </Box>

      <Box as="main" p={6} borderWidth={1} borderRadius="xl" borderColor="gray.700" bg="gray.800" shadow="2xl" minW="md">
        {currentScreen === 'JOIN' && <JoinQueue />}

        {(currentScreen === 'WAITING_FOR_MATCH' || currentScreen === 'WAITING_FOR_REVEAL') && (
          <Flex direction="column" align="center" justify="center" py={8} textAlign="center">
            <Spinner size="xl" mb={4} color="blue.400" thickness="4px" />
            <Heading as="h2" size="md" mb={2} color="white">
              Processing On-Chain Events...
            </Heading>
            <Text color="gray.400" fontSize="sm" maxW="xs">
              {screenMessage}
            </Text>
          </Flex>
        )}

        {currentScreen === 'PICK' && (
          <PickMove 
            matchAddress={matchAddress} 
            playerAddress={playerAddress} 
          />
        )}

        {currentScreen === 'REVEAL_PHASE' && lastRound && (
          <RevealResult 
            matchAddress={matchAddress} 
            roundData={lastRound}
            onRevealSuccess={scores.player < 2 && scores.opponent < 2 ? handleNextRoundReady : undefined}
          />
        )}

        {currentScreen === 'GAME_OVER' && (
          <GameOver result={finalResult} onReset={handleReset} />
        )}
      </Box>
    </Flex>
  );
}