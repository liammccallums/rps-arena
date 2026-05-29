import { Box, Heading, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState } from 'react';
import { solidityPackedKeccak256, ethers } from 'ethers';
import { commitMove } from './contract';
import { getErrorMessage } from './errorMessage';

interface MoveOption {
  id: 'Rock' | 'Paper' | 'Scissors';
  value: number; // Maps directly to Solidity Enum (1, 2, 3)
  icon: string;
}

interface PickMoveProps {
  matchAddress: string;
  playerAddress: string;
  onCommitSuccess?: () => void;
}

export default function PickMove({ matchAddress, playerAddress, onCommitSuccess }: PickMoveProps) {
  const moves: MoveOption[] = [
    { id: 'Rock', value: 1, icon: '✊' },
    { id: 'Paper', value: 2, icon: '✋' },
    { id: 'Scissors', value: 3, icon: '✌️' }
  ];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCommitMove = async (chosenMove: MoveOption) => {
    setLoading(true);
    setMessage('Generating commitment...');
    
    try {
      // 1. Generate a secure random 32-byte secret (bytes32)
      const randomSecret = ethers.hexlify(ethers.randomBytes(32));
      
      // 2. Compute keccak256(abi.encodePacked(uint8, bytes32, address)) locally
      const commitment = solidityPackedKeccak256(
        ['uint8', 'bytes32', 'address'],
        [chosenMove.value, randomSecret, playerAddress]
      );

      setMessage('Signing transaction in MetaMask...');
      
      // 3. Send transaction to the specific match contract
      await commitMove(matchAddress, commitment);
      
      // 4. Save plain elements locally so the player can reveal them next phase
      localStorage.setItem(`match_${matchAddress}_move`, chosenMove.value.toString());
      localStorage.setItem(`match_${matchAddress}_secret`, randomSecret);

      setMessage('Move committed successfully! Waiting for opponent...');
      
      if (onCommitSuccess) {
        onCommitSuccess();
      }
    } catch (error: unknown) {
      console.error("Failed to commit move:", error);
      setMessage(`Error: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box textAlign="center" p={4}>
      <Heading as="h2" size="lg" mb={6}>Select Your Move</Heading>
      
      <Flex gap={4} justify="center" wrap="wrap">
        {moves.map((move) => (
          <Flex
            key={move.id} 
            direction="column" align="center" justify="center"
            p={6} borderWidth={1} borderRadius="lg" borderColor="gray.600" bg="gray.700"
            _hover={!loading ? { transform: 'translateY(-5px)', borderColor: 'blue.500', bg: 'gray.600' } : {}}
            cursor={loading ? 'not-allowed' : 'pointer'} 
            minW="130px"
            opacity={loading ? 0.6 : 1}
            onClick={() => !loading && handleCommitMove(move)}
          >
            <Text fontSize="4xl" mb={2}>{move.icon}</Text>
            <Heading as="h3" size="md" color="white">{move.id}</Heading>
          </Flex>
        ))}
      </Flex>

      {message && (
        <Flex align="center" justify="center" gap={3} mt={6}>
          {loading && <Spinner size="sm" color="blue.500" />}
          <Text fontSize="sm" color={message.startsWith('Error') ? 'red.400' : 'gray.300'}>
            {message}
          </Text>
        </Flex>
      )}
    </Box>
  );
}