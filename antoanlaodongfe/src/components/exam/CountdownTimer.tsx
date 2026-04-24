import { Box, Typography } from '@mui/material';
import { AccessAlarm } from '@mui/icons-material';
import { formatCountdown } from '@/utils/formatters';

interface CountdownTimerProps {
  secondsLeft: number;
  color: 'success' | 'warning' | 'error';
}

export default function CountdownTimer({ secondsLeft, color }: CountdownTimerProps) {
  const isUrgent = secondsLeft <= 60;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: `${color}.main`,
        color: 'white',
        animation: isUrgent ? 'pulse 1s infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
      }}
    >
      <AccessAlarm fontSize="small" />
      <Typography variant="h6" fontWeight={700} fontFamily="monospace">
        {formatCountdown(secondsLeft)}
      </Typography>
    </Box>
  );
}
