import { Box, Heading, Button, Text, Stat, StatLabel, StatNumber } from '@chakra-ui/react';

interface GameOverProps {
  result: 'WIN' | 'LOSS';
  onReset: () => void; // Clears dynamic room IDs and brings the player back to the JoinQueue view
}

export default function GameOver({ result, onReset }: GameOverProps) {
  const isWinner = result === 'WIN';
  const resultColor = isWinner ? 'green.400' : 'red.400';

  return (
    <Box textAlign="center" p={8} borderWidth={1} borderRadius="lg" bg="gray.800" borderColor="gray.700">
      <Heading as="h1" size="xl" mb={2} color="white">
        Match Over
      </Heading>
      
      <Heading as="h2" size="lg" color={resultColor} mb={6}>
        {isWinner ? '🏆 Victory! You Won!' : '💀 Defeat! Match Lost.'}
      </Heading>

      {/* Visual representation of the financial stake transition */}
      <Box my={6} p={4} bg="gray.900" borderRadius="md" borderWidth={1} borderColor="gray.700">
        <Stat size="sm">
          <StatLabel color="gray.400" fontSize="sm">
            {isWinner ? 'Escrow Reward Disbursed' : 'Entry Fee Deposited'}
          </StatLabel>
          <StatNumber color={isWinner ? 'green.300' : 'red.300'} fontSize="2xl">
            {isWinner ? '+ 2.0 ETH' : '- 1.0 ETH'}
          </StatNumber>
        </Stat>
        <Text fontSize="xs" color="gray.500" mt={2}>
          {isWinner 
            ? 'The smart contract has automatically transferred the pool balance to your active account.' 
            : 'Better luck next time! Your staked entry fee has been claimed by the winner.'}
        </Text>
      </Box>

      <Button 
        colorScheme="blue" 
        onClick={onReset}
        w="full"
        size="lg"
        mt={2}
      >
        Return to Matchmaking
      </Button>
    </Box>
  );
}