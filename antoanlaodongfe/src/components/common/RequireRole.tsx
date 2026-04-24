import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/enums';

interface Props {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrap a route/page to restrict it to users whose role is in `roles`.
 * If user is not authenticated, bounce to the login screen.
 */
export default function RequireRole({ roles, children, fallback }: Props) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!user || !roles.includes(user.role)) {
    return (
      fallback || (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 420 }}>
            <Lock sx={{ fontSize: 56, color: 'error.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>Không có quyền truy cập</Typography>
            <Typography variant="body2" color="text.secondary">
              Tài khoản của bạn không được phép truy cập trang này.
            </Typography>
          </Paper>
        </Box>
      )
    );
  }

  return <>{children}</>;
}
