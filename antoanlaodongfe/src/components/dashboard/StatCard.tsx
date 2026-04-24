import { Paper, Stack, Typography, Box } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

type Variant = 'default' | 'accent' | 'warning' | 'destructive' | 'success';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: Variant;
}

const variantStyles: Record<Variant, { bg: string; fg: string }> = {
  default:     { bg: 'rgba(21,101,192,0.1)',  fg: '#1565c0' },
  accent:      { bg: 'rgba(46,125,50,0.1)',   fg: '#2e7d32' },
  warning:     { bg: 'rgba(245,124,0,0.12)',  fg: '#f57c00' },
  destructive: { bg: 'rgba(198,40,40,0.1)',   fg: '#c62828' },
  success:     { bg: 'rgba(46,125,50,0.1)',   fg: '#2e7d32' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, variant = 'default' }: Props) {
  const s = variantStyles[variant];
  return (
    <Paper variant="outlined" sx={{
      p: 2.5, borderRadius: 3, height: '100%',
      transition: 'box-shadow .2s',
      '&:hover': { boxShadow: 2 },
    }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ bgcolor: s.bg, color: s.fg, borderRadius: 2, p: 1.25, display: 'inline-flex' }}>
          <Icon size={20} />
        </Box>
      </Stack>
    </Paper>
  );
}
