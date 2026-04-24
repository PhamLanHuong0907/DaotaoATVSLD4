import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, LinearProgress, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Business } from '@mui/icons-material';

import { reportApi } from '@/api/reportApi';

export default function DepartmentStatsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats-by-dept'],
    queryFn: () => reportApi.byDepartment(),
  });

  if (isLoading) return <LinearProgress />;
  if (!data || data.items.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">Chưa có dữ liệu thống kê</Typography>
      </Paper>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Business color="primary" />
          <Typography variant="h6">Thống kê theo phòng ban</Typography>
          <Typography variant="caption" color="text.secondary">
            ({data.total_submissions} bài thi)
          </Typography>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Tổng</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Đạt</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Trượt</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Điểm TB</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Tỉ lệ đạt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((d) => (
                <TableRow key={d.department_id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{d.department_name}</Typography>
                    {d.department_code && (
                      <Typography variant="caption" color="text.secondary">{d.department_code}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{d.total}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="success.main" fontWeight={500}>
                      {d.passed}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="error.main" fontWeight={500}>
                      {d.fail}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{d.average_score.toFixed(2)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={d.pass_rate}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        color={d.pass_rate >= 80 ? 'success' : d.pass_rate >= 50 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {d.pass_rate}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
