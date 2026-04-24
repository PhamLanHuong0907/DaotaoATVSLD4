import { RadioGroup, FormControlLabel, Radio, Paper, Typography, Box } from '@mui/material';
import type { ExamQuestionOption } from '@/types/exam';

interface MultipleChoiceQuestionProps {
  options: ExamQuestionOption[];
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
}

export default function MultipleChoiceQuestion({ options, selectedAnswer, onAnswer }: MultipleChoiceQuestionProps) {
  return (
    <RadioGroup value={selectedAnswer || ''} onChange={(e) => onAnswer(e.target.value)}>
      {options.map((opt) => (
        <Paper
          key={opt.label}
          variant="outlined"
          sx={{
            mb: 1.5,
            px: 2,
            py: 0.5,
            cursor: 'pointer',
            transition: 'all 0.15s',
            borderColor: selectedAnswer === opt.label ? 'primary.main' : 'divider',
            bgcolor: selectedAnswer === opt.label ? 'primary.50' : 'transparent',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: selectedAnswer === opt.label ? 'primary.50' : 'action.hover',
            },
          }}
          onClick={() => onAnswer(opt.label)}
        >
          <FormControlLabel
            value={opt.label}
            control={<Radio />}
            sx={{ width: '100%', m: 0 }}
            label={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', py: 0.5 }}>
                <Typography
                  component="span"
                  fontWeight={700}
                  color="primary"
                  sx={{ minWidth: 24 }}
                >
                  {opt.label}.
                </Typography>
                <Typography component="span">{opt.text}</Typography>
              </Box>
            }
          />
        </Paper>
      ))}
    </RadioGroup>
  );
}
