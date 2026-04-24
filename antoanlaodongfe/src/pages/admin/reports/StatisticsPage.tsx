import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Typography, Card, CardContent, Box, TextField, MenuItem, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Chip, Button, Skeleton, Grid,
  alpha,
} from '@mui/material';
import {
  FileDownload, School, Description, Quiz, People,
  Assignment, CheckCircle, TrendingUp,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import DepartmentStatsTable from '@/components/common/DepartmentStatsTable';
import { reportApi, type DashboardResponse, type StatisticsResponse } from '@/api/reportApi';

const groupByOptions = [
  { value: 'occupation', label: 'Theo nghề' },
  { value: 'classification', label: 'Theo xếp loại' },
  { value: 'department_id', label: 'Theo đơn vị' },
];

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

function DashboardCard({ title, value, icon, color, suffix }: DashboardCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderLeft: 4,
        borderLeftColor: color,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.1),
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}{suffix}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function StatisticsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [groupBy, setGroupBy] = useState('occupation');

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => reportApi.dashboard(),
  });

  const { data, isLoading } = useQuery<StatisticsResponse>({
    queryKey: ['statistics', groupBy],
    queryFn: () => reportApi.statistics({ group_by: groupBy }),
  });

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const blob = type === 'excel'
        ? await reportApi.exportExcel({ report_type: 'exam_results' })
        : await reportApi.exportPdf({ report_type: 'exam_results' });
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Lỗi xuất báo cáo', { variant: 'error' });
    }
  };

  const dashboardCards = dashboard
    ? [
        { title: 'Khóa học đang hoạt động', value: dashboard.active_courses, icon: <School />, color: '#1565c0' },
        { title: 'Tài liệu', value: dashboard.total_documents, icon: <Description />, color: '#6a1b9a' },
        { title: 'Ngân hàng câu hỏi', value: dashboard.total_questions, icon: <Quiz />, color: '#e65100' },
        { title: 'Người dùng', value: dashboard.total_users, icon: <People />, color: '#2e7d32' },
        { title: 'Kỳ thi đang mở', value: dashboard.active_exams, icon: <Assignment />, color: '#c62828' },
        { title: 'Bài thi đã nộp', value: dashboard.total_submissions, icon: <CheckCircle />, color: '#00838f' },
        { title: 'Tỷ lệ đạt', value: dashboard.pass_rate, icon: <TrendingUp />, color: '#558b2f', suffix: '%' },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Thống kê & Báo cáo"
        subtitle="Phân tích kết quả huấn luyện ATVSLĐ"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={() => handleExport('excel')}>Xuất Excel</Button>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={() => handleExport('pdf')}>Xuất PDF</Button>
          </Stack>
        }
      />

      {/* Dashboard Summary Cards */}
      {dashboardLoading ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 12 / 7 }} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {dashboardCards.map((card) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={card.title}>
              <DashboardCard {...card} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* By department widget */}
      <Box sx={{ mb: 4 }}>
        <DepartmentStatsTable />
      </Box>

      {/* Statistics Section */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Thống kê chi tiết
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select size="small" label="Nhóm theo" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} sx={{ minWidth: 180 }}>
          {groupByOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : !data?.statistics?.length ? (
        <Card><CardContent><Typography color="text.secondary" textAlign="center">Chưa có dữ liệu thống kê</Typography></CardContent></Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Nhóm</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Tổng</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Đạt</TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Tỷ lệ đạt</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>TB điểm</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Giỏi</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Khá</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>TB</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Không đạt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.statistics.map((stat) => (
                <TableRow key={stat.group} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell><Typography variant="body2" fontWeight={500}>{stat.group}</Typography></TableCell>
                  <TableCell align="center">{stat.total}</TableCell>
                  <TableCell align="center">{stat.passed}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate" value={stat.pass_rate}
                        color={stat.pass_rate >= 80 ? 'success' : stat.pass_rate >= 60 ? 'warning' : 'error'}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 45 }}>
                        {stat.pass_rate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600}>{stat.avg_score.toFixed(1)}</Typography>
                  </TableCell>
                  <TableCell align="center"><Chip label={stat.excellent} size="small" color="success" /></TableCell>
                  <TableCell align="center"><Chip label={stat.good} size="small" color="info" /></TableCell>
                  <TableCell align="center"><Chip label={stat.average} size="small" color="warning" /></TableCell>
                  <TableCell align="center"><Chip label={stat.fail} size="small" color="error" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
