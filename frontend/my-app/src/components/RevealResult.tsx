import { Box, Heading, Flex, Text, Button } from '@chakra-ui/react';
import { useState } from 'react';
import { revealMove } from './contract'; // Arrowing to your updated contracts file

// Explicitly mapping Solidity's Move enum indices for UI labels
const MOVE_MAP: Record<number, string> = {
  1: 'Rock ✊',
  2: 'Paper ✋',
  3: 'Scissors ✌️'
};

interface RevealResultProps {
  matchAddress: string;
  roundData: {
    playerMove: number;   // 1, 2, or 3 from current game state
    opponentMove: number; // 1, 2, or 3 parsed from the RoundWon/RoundDraw event logs
    result: 'WIN' | 'LOSS' | 'DRAW';
  };
  onRevealSuccess?: () => void;
}

export default function RevealResult({ matchAddress, roundData, onRevealSuccess }: RevealResultProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasRevealed, setHasRevealed] = useState(false);

  const resultColor = roundData.result === 'WIN' ? 'green.400' : roundData.result === 'LOSS' ? 'red.400' : 'gray.400';

  const handleRevealMove = async () => {
    setLoading(true);
    setMessage('Retrieving secret key from local storage...');
    
    try {
      // Pull the secrets we cached during the PickMove phase
      const savedMoveStr = localStorage.getItem(`match_${matchAddress}_move`);
      const savedSecret = localStorage.getItem(`match_${matchAddress}_secret`);

      if (!savedMoveStr || !savedSecret) {
        throw new Error("Cryptographic secret keys not found in this browser's local storage.");
      }

      const savedMove = parseInt(savedMoveStr, 10);
      setMessage('Signing reveal transaction in MetaMask...');

      // Execute the call on Match.sol
      await revealMove(matchAddress, savedMove, savedSecret);
      setMessage('Transaction sent! Waiting for validation...');
      
      setHasRevealed(true);
      setMessage('Move validated on-chain!');
      
      if (onRevealSuccess) {
        onRevealSuccess();
      }
    } catch (error: any) {
      console.error("Failed to reveal move:", error);
      setMessage(`Error: ${error.reason || error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box textAlign="center" p={5} borderWidth={1} borderRadius="lg" bg="gray.800" borderColor="gray.700">
      <Heading as="h2" size="lg" mb={4} color="white">Reveal Phase</Heading>
      
      {!hasRevealed ? (
        <Box my={6}>
          <Text mb={4} color="gray.300">
            Both players have committed! You must now open your vault to reveal your choice.
          </Text>
          <Button
            colorScheme="green"
            onClick={handleRevealMove}
            isLoading={loading}
            loadingText="Revealing..."
            w="full"
          >
            Reveal My Choice ({MOVE_MAP[roundData.playerMove] || 'Unknown'})
          </Button>
        </Box>
      ) : (
        <>
          <Flex align="center" justify="space-around" my={8} gap={10}>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.400" mb={1}>You Played</Text>
              <Heading as="h3" size="lg" color="white">
                {MOVE_MAP[roundData.playerMove] || 'None'}
              </Heading>
            </Box>
            
            <Text fontSize="2xl" fontWeight="bold" color="gray.500">VS</Text>
            
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.400" mb={1}>Opponent Played</Text>
              <Heading as="h3" size="lg" color="white">
                {MOVE_MAP[roundData.opponentMove] || 'None'}
              </Heading>
            </Box>
          </Flex>

          <Heading as="h2" size="xl" color={resultColor} mt={4}>
            {roundData.result === 'DRAW' ? 'You Tied!' : `You ${roundData.result}!`}
          </Heading>
        </>
      )}

      {message && (
        <Text mt={4} fontSize="sm" color={message.startsWith('Error') ? 'red.400' : 'blue.300'}>
          {message}
        </Text>
      )}
    </Box>
  );
}