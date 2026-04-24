import { Stack, Button } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

interface TrueFalseQuestionProps {
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export default function TrueFalseQuestion({ selectedAnswer, onAnswer }: TrueFalseQuestionProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      <Button
        variant={selectedAnswer === 'true' ? 'contained' : 'outlined'}
        color="success"
        size="large"
        startIcon={<Check />}
        onClick={() => onAnswer('true')}
        sx={{ flex: 1, py: 2, fontSize: '1.1rem' }}
      >
        Đúng
      </Button>
      <Button
        variant={selectedAnswer === 'false' ? 'contained' : 'outlined'}
        color="error"
        size="large"
        startIcon={<Close />}
        onClick={() => onAnswer('false')}
        sx={{ flex: 1, py: 2, fontSize: '1.1rem' }}
      >
        Sai
      </Button>
    </Stack>
  );
}
