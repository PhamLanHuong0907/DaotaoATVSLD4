import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Stack, Chip, List, ListItem, ListItemText, Button,
  Box, Divider,
} from '@mui/material';
import { WarningAmber, NotificationsActive, EventRepeat } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { certificateApi } from '@/api/certificateApi';

export default function ExpiringCertsCard() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expiring-certs'],
    queryFn: () => certificateApi.expiringSummary(60),
  });

  const notify = useMutation({
    mutationFn: () => certificateApi.notifyExpiringNow(30),
    onSuccess: (res) => {
      enqueueSnackbar(`Đã gửi ${res.sent} thông báo nhắc gia hạn`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['expiring-certs'] });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const createRetrain = useMutation({
    mutationFn: () => certificateApi.createRetrainPeriod({ within_days: 60 }),
    onSuccess: (res) => {
      enqueueSnackbar(
        `Đã tạo kỳ thi tái cấp cho ${res.affected_users} người (${res.departments} phòng ban)`,
        { variant: 'success' },
      );
      navigate(`/admin/periods/${res.period_id}/edit`);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  if (isLoading || !data) return null;

  const { expiring_count, expired_count, items } = data;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmber color="warning" />
            <Typography variant="h6">Chứng chỉ sắp hết hạn</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              size="small" startIcon={<NotificationsActive />}
              onClick={() => notify.mutate()} disabled={notify.isPending}
            >
              Gửi nhắc
            </Button>
            <Button
              size="small" variant="contained" color="warning" startIcon={<EventRepeat />}
              onClick={() => createRetrain.mutate()}
              disabled={createRetrain.isPending || (expiring_count + expired_count === 0)}
            >
              Tạo kỳ tái cấp
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Sắp hết hạn (60 ngày)</Typography>
            <Typography variant="h4" color="warning.main">{expiring_count}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" color="text.secondary">Đã hết hạn</Typography>
            <Typography variant="h4" color="error.main">{expired_count}</Typography>
          </Box>
        </Stack>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Không có chứng chỉ nào cần xử lý gấp
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 280, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
            {items.map((c) => (
              <ListItem
                key={c.id}
                secondaryAction={
                  <Chip
                    size="small"
                    label={c.days_left !== null ? `${c.days_left} ngày` : ''}
                    color={c.days_left !== null && c.days_left <= 7 ? 'error' : 'warning'}
                  />
                }
              >
                <ListItemText
                  primary={`${c.full_name} (${c.employee_id})`}
                  secondary={
                    <>
                      {c.exam_name} · Hạn: {c.valid_until ? dayjs(c.valid_until).format('DD/MM/YYYY') : '—'}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
