import { Box, Heading, Text, Button } from '@chakra-ui/react';
import type { ContractTransactionReceipt, ContractTransactionResponse } from 'ethers';
import { useState } from 'react';
import { assignPlayer, getAssignedMatchFromReceipt } from './contract'; // Arrowing to your updated contracts file

interface JoinQueueProps {
  onAssigned: (playerAddress: string, matchAddress: string) => void;
}

export default function JoinQueue({ onAssigned }: JoinQueueProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleJoinQueue = async () => {
    setLoading(true);
    setMessage('Joining queue...');
    try {
      const tx: ContractTransactionResponse = await assignPlayer();
      setMessage(`Transaction sent! Hash: ${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}. Waiting for block confirmation...`);
      
      const receipt = await tx.wait() as ContractTransactionReceipt; // Wait for the transaction to be mined
      const playerAddress = (tx.from ?? '').toLowerCase();
      const matchAddress = playerAddress ? getAssignedMatchFromReceipt(receipt, playerAddress) : null;

      if (playerAddress && matchAddress) {
        onAssigned(playerAddress, matchAddress);
      }

      setMessage('Successfully joined the queue! Finding a match...');
      
      // Pro-tip: This is the perfect spot to fire a callback (e.g., onJoined())
      // to let the parent layout know it should start listening to the 
      // Manager's `PlayerAssigned` or `MatchStarted` events.
    } catch (error: any) {
      console.error("Failed to join queue:", error);
      // Ethers v6 errors often package the clean reason under error.reason
      setMessage(`Error joining queue: ${error.reason || error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={5} borderWidth={1} borderRadius="lg" bg="gray.800" borderColor="gray.700">
      <Heading as="h2" size="lg" mb={2} color="white">Ready to Play?</Heading>
      <Text mb={4} color="gray.400">Stake your tokens and enter the matchmaking queue.</Text>
      
      <Button 
        colorScheme="blue" 
        onClick={handleJoinQueue}
        isLoading={loading} // Automatically disables interaction and shows a spinner
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