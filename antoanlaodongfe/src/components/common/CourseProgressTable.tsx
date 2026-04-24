import { useQuery } from '@tanstack/react-query';
import {
  Box, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material';
import dayjs from 'dayjs';

import { lessonProgressApi } from '@/api/lessonProgressApi';

interface Props {
  courseId: string;
}

function fmtSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}p`;
}

export default function CourseProgressTable({ courseId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['course-users-progress', courseId],
    queryFn: () => lessonProgressApi.adminUsersProgress(courseId),
  });

  if (isLoading) return <LinearProgress />;
  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Chưa có học viên nào học khoá này
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Mã NV</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Họ và tên</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>Đã hoàn thành</TableCell>
            <TableCell align="center" sx={{ fontWeight: 600 }}>Thời gian học</TableCell>
            <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Tiến độ</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Lần học gần nhất</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((u) => (
            <TableRow key={u.user_id}>
              <TableCell>{u.employee_id}</TableCell>
              <TableCell>{u.full_name}</TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight={500}>
                  {u.completed}/{u.total_lessons}
                </Typography>
              </TableCell>
              <TableCell align="center">{fmtSeconds(u.time_spent_seconds)}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={u.percent}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    color={u.percent >= 100 ? 'success' : u.percent >= 50 ? 'primary' : 'warning'}
                  />
                  <Typography variant="caption" sx={{ minWidth: 40 }}>{u.percent}%</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="caption">
                  {dayjs(u.last_viewed_at).format('DD/MM/YYYY HH:mm')}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
