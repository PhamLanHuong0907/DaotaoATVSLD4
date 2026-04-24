import { TextField, Typography, Box } from '@mui/material';

interface ScenarioQuestionProps {
  textAnswer: string;
  onAnswer: (answer: string) => void;
}

export default function ScenarioQuestion({ textAnswer, onAnswer }: ScenarioQuestionProps) {
  return (
    <Box sx={{ mt: 2 }}>
      <TextField
        multiline
        rows={6}
        fullWidth
        placeholder="Nhập câu trả lời của bạn..."
        value={textAnswer}
        onChange={(e) => onAnswer(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '1rem',
          },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {textAnswer.length} ký tự
      </Typography>
    </Box>
  );
}
