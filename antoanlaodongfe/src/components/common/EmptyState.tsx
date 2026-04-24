import { Box, Typography } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ message = 'Không có dữ liệu', action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
      <InboxOutlined sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
      <Typography variant="body1" gutterBottom>
        {message}
      </Typography>
      {action}
    </Box>
  );
}
