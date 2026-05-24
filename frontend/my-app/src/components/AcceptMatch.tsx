import { Box, Heading, Text, Button } from '@chakra-ui/react';

interface AcceptMatchProps {
  onAccept: () => void;
}

export default function AcceptMatch({ onAccept }: AcceptMatchProps) {
  return (
    <Box>
      <Heading as="h2" size="lg" mb={2}>Opponent Found!</Heading>
      <Text mb={4}>Do you accept this match?</Text>
      <Button colorScheme="green" onClick={onAccept}>Accept Match</Button>
    </Box>
  );
}