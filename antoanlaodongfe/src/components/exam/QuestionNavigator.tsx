import { Box, Button, Typography, Paper } from '@mui/material';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  answeredSet: Set<number>;
  onNavigate: (index: number) => void;
}

export default function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answeredSet,
  onNavigate,
}: QuestionNavigatorProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Danh sách câu hỏi
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Đã trả lời: {answeredSet.size}/{totalQuestions}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.75,
        }}
      >
        {Array.from({ length: totalQuestions }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answeredSet.has(i);
          return (
            <Button
              key={i}
              size="small"
              variant={isCurrent ? 'contained' : isAnswered ? 'contained' : 'outlined'}
              color={isCurrent ? 'secondary' : isAnswered ? 'primary' : 'inherit'}
              onClick={() => onNavigate(i)}
              sx={{
                minWidth: 0,
                width: 40,
                height: 40,
                fontSize: '0.85rem',
                fontWeight: isCurrent ? 700 : 500,
                ...((!isCurrent && !isAnswered) && {
                  borderColor: 'divider',
                  color: 'text.secondary',
                }),
              }}
            >
              {i + 1}
            </Button>
          );
        })}
      </Box>
    </Paper>
  );
}
