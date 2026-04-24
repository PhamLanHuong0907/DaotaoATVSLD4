import { Grid, Paper, Stack, Typography, Box } from '@mui/material';
import {
  Users, Building2, FileQuestion, FileText, ClipboardCheck, BookOpen, Award, Warehouse,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from './StatCard';
import type { DashboardExtendedResponse } from '@/api/reportApi';

interface Props {
  data: DashboardExtendedResponse;
}

const CLASSIFICATION_COLORS = ['#2e7d32', '#1565c0', '#f57c00', '#c62828'];

export default function GeneralOverview({ data }: Props) {
  const trendData = data.trend_12_months.map((t) => ({
    month: t.label,
    'Số lượt nộp': t.submissions,
  }));

  const br = data.classification_breakdown;
  const pieData = [
    { name: 'Xuất sắc', value: br.excellent },
    { name: 'Khá', value: br.good },
    { name: 'Trung bình', value: br.average },
    { name: 'Không đạt', value: br.fail },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Tổng quan chung</Typography>
        <Typography variant="body2" color="text.secondary">
          Thống kê tổng hợp toàn hệ thống
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={Users} title="Người dùng" value={data.total_users} subtitle="Tài khoản hoạt động" variant="default" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={Building2} title="Phòng ban" value={data.total_departments} subtitle="Đơn vị tham gia" variant="accent" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={FileQuestion} title="Ngân hàng câu hỏi" value={data.total_questions} subtitle="Câu hỏi đã duyệt" variant="default" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={FileText} title="Tổng tài liệu" value={data.total_documents} subtitle="Tài liệu huấn luyện" variant="accent" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={ClipboardCheck} title="Số đề thi" value={data.active_exams} subtitle="Đang hoạt động" variant="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={BookOpen} title="Số khóa học" value={data.active_courses} subtitle="Đã duyệt" variant="default" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={Award} title="Chứng chỉ" value={data.total_certificates} subtitle="Đã cấp phát" variant="accent" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={Warehouse} title="Cơ sở vật chất" value={data.total_facilities} subtitle="Phòng học & thiết bị" variant="warning" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TrendingUp size={20} color="#1565c0" />
              <Typography variant="subtitle1" fontWeight={600}>Xu hướng nộp bài 12 tháng</Typography>
            </Stack>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Số lượt nộp" stroke="#1565c0" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Phân loại kết quả</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CLASSIFICATION_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${Number(v ?? 0)} bài`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Tuân thủ theo phòng ban</Typography>
            <Stack spacing={1.5}>
              {data.department_compliance.slice(0, 8).map((d) => (
                <Box key={d.id}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>{d.name}</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {d.compliance}% ({d.passed_users}/{d.total})
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: '#e2e8f0', borderRadius: 1 }}>
                    <Box sx={{
                      height: '100%', width: `${d.compliance}%`, borderRadius: 1,
                      bgcolor: d.compliance >= 80 ? '#2e7d32' : d.compliance >= 50 ? '#f57c00' : '#c62828',
                    }} />
                  </Box>
                </Box>
              ))}
              {!data.department_compliance.length && (
                <Typography variant="body2" color="text.secondary">Chưa có dữ liệu</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Sự kiện sắp tới</Typography>
            <Stack spacing={1.5} sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {data.upcoming_events.map((e) => (
                <Box key={e.id} sx={{
                  p: 1.5, borderRadius: 2,
                  bgcolor: e.urgent ? 'rgba(245,124,0,0.08)' : 'rgba(21,101,192,0.05)',
                  borderLeft: 3, borderColor: e.urgent ? '#f57c00' : '#1565c0',
                }}>
                  <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {e.dept} · {new Date(e.date).toLocaleString('vi-VN')}
                  </Typography>
                </Box>
              ))}
              {!data.upcoming_events.length && (
                <Typography variant="body2" color="text.secondary">Không có sự kiện sắp tới</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Hoạt động gần đây</Typography>
        <Stack spacing={1} divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
          {data.recent_activity.map((a, i) => (
            <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2">
                <b>{a.user}</b> — {a.action}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {a.time ? new Date(a.time).toLocaleString('vi-VN') : ''}
              </Typography>
            </Stack>
          ))}
          {!data.recent_activity.length && (
            <Typography variant="body2" color="text.secondary">Chưa có hoạt động</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
