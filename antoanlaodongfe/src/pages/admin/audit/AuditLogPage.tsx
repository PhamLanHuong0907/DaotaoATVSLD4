import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Chip, MenuItem, Pagination, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { auditApi } from '@/api/auditApi';

const methodOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

const methodColor: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  POST: 'success',
  PUT: 'info',
  PATCH: 'warning',
  DELETE: 'error',
};

export default function AuditLogPage() {
  const [method, setMethod] = useState('');
  const [pathPrefix, setPathPrefix] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { method, pathPrefix, page }],
    queryFn: () =>
      auditApi.list({
        method: method || undefined,
        path_prefix: pathPrefix || undefined,
        page,
        page_size: pageSize,
      }),
  });

  return (
    <>
      <PageHeader title="Nhật ký hệ thống" subtitle="Lịch sử thao tác của người dùng (admin)" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select size="small" label="Phương thức" value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          sx={{ minWidth: 160 }}
        >
          {methodOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          size="small" label="Tiền tố đường dẫn" value={pathPrefix}
          onChange={(e) => { setPathPrefix(e.target.value); setPage(1); }}
          placeholder="/api/v1/exam-rooms"
          sx={{ minWidth: 280 }}
        />
      </Stack>

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : !data?.items.length ? (
        <EmptyState message="Chưa có nhật ký nào" />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Thời điểm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Người thực hiện</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Đường dẫn</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Mã trả về</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{dayjs(row.created_at).format('DD/MM/YYYY HH:mm:ss')}</TableCell>
                    <TableCell>
                      {row.actor_username || <Typography variant="caption" color="text.secondary">ẩn danh</Typography>}
                      {row.actor_role && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.actor_role}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.method} color={methodColor[row.method] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.path}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={row.status_code}
                        color={row.status_code < 300 ? 'success' : row.status_code < 400 ? 'info' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.ip || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}
    </>
  );
}
