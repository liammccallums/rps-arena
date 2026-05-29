import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { useState } from 'react';
import { assignPlayer } from './contract';
import { getErrorMessage } from './errorMessage';

interface JoinQueueProps {
  onAssigned: (matchAddress: string, playerAddress: string) => void;
}

export default function JoinQueue({ onAssigned }: JoinQueueProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleJoinQueue = async () => {
    setLoading(true);
    setMessage('Joining queue. Confirm the transaction in MetaMask...');

    try {
      const assignment = await assignPlayer();
      setMessage(
        `Assigned to a match. Transaction: ${assignment.transactionHash.slice(0, 8)}...${assignment.transactionHash.slice(-6)}`
      );
      onAssigned(assignment.matchAddress, assignment.playerAddress);
    } catch (error: unknown) {
      console.error('Failed to join queue:', error);
      setMessage(`Error joining queue: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={5} borderWidth={1} borderRadius="lg" bg="gray.800" borderColor="gray.700">
      <Heading as="h2" size="lg" mb={2} color="white">Ready to Play?</Heading>
      <Text mb={4} color="gray.400">Stake your test ETH and enter the matchmaking queue.</Text>

      <Button
        colorScheme="blue"
        onClick={handleJoinQueue}
        isLoading={loading}
        loadingText="Processing..."
        w="full"
      >
        Join Matchmaking Queue (0.001 ETH)
      </Button>

      {message && (
        <Text mt={4} fontSize="sm" color={message.startsWith('Error') ? 'red.400' : 'blue.300'}>
          {message}
        </Text>
      )}
    </Box>
  );
}
