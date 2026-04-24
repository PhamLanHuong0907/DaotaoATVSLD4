import { Grid, Paper, Stack, Typography, Box } from '@mui/material';
import { BookOpen, CheckCircle2, Users } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import StatCard from './StatCard';
import type { DashboardExtendedResponse } from '@/api/reportApi';

interface Props {
  data: DashboardExtendedResponse;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: 'Đã duyệt', color: '#2e7d32' },
  rejected: { label: 'Từ chối', color: '#c62828' },
  pending:  { label: 'Chờ duyệt', color: '#f57c00' },
  draft:    { label: 'Bản nháp', color: '#64748b' },
};

export default function CourseOverview({ data }: Props) {
  const total = data.courses_list.length;
  const approved = data.courses_list.filter((c) => c.status === 'approved').length;
  const rejected = data.courses_list.filter((c) => c.status === 'rejected').length;
  const pending  = data.courses_list.filter((c) => c.status === 'pending').length;
  const draft    = data.courses_list.filter((c) => c.status === 'draft').length;

  const approvedRate = total ? ((approved / total) * 100).toFixed(1) : '0';
  const totalLearners = data.courses_list.reduce((s, c) => s + c.learners, 0);
  const totalCompleted = data.courses_list.reduce((s, c) => s + c.completed, 0);
  const completionRate = totalLearners ? ((totalCompleted / totalLearners) * 100).toFixed(1) : '0';

  const pieData = [
    { name: 'Đã duyệt', value: approved, color: STATUS_CONFIG.approved.color },
    { name: 'Từ chối',  value: rejected, color: STATUS_CONFIG.rejected.color },
    { name: 'Chờ duyệt', value: pending, color: STATUS_CONFIG.pending.color },
    { name: 'Bản nháp', value: draft, color: STATUS_CONFIG.draft.color },
  ].filter((e) => e.value > 0);

  const trend = data.course_monthly_stats.map((t) => ({
    month: `T${parseInt(t.month.split('-')[1] || '0', 10)}`,
    'Tỷ lệ hoàn thành (%)': t.completionRate,
  }));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Tổng quan khóa học</Typography>
        <Typography variant="body2" color="text.secondary">
          Thống kê các khóa huấn luyện an toàn vệ sinh lao động
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={BookOpen} title="Tổng khóa học" value={total}
            subtitle="Tổng số khóa đào tạo" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={CheckCircle2} title="Tỷ lệ đã duyệt" value={`${approvedRate}%`}
            subtitle={`${approved}/${total} khóa`} variant="accent" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={Users} title="Tỷ lệ hoàn thành" value={`${completionRate}%`}
            subtitle={`${totalCompleted}/${totalLearners} học viên`} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Trạng thái duyệt khóa học
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={85} paddingAngle={3}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${Number(v ?? 0)} khóa`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Chưa có khóa học</Typography>
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack spacing={1}>
                  {pieData.map((e) => (
                    <Box key={e.name} sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      py: 1, px: 1.5, borderRadius: 2, bgcolor: '#f8fafc',
                    }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: e.color }} />
                        <Typography variant="body2" fontWeight={500}>{e.name}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="h6" fontWeight={700}>{e.value}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({total ? Math.round((e.value / total) * 100) : 0}%)
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Danh sách khóa học</Typography>
            <Stack spacing={1} sx={{ maxHeight: 280, overflowY: 'auto' }}>
              {data.courses_list.map((c) => {
                const cfg = STATUS_CONFIG[c.status] || { label: c.status, color: '#64748b' };
                return (
                  <Box key={c.id} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    py: 1, px: 1.5, borderRadius: 2, bgcolor: '#f8fafc',
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color }} />
                      <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {c.completed}/{c.learners} HV
                      </Typography>
                      <Box sx={{
                        px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                        bgcolor: `${cfg.color}22`, color: cfg.color,
                      }}>
                        {cfg.label}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
              {!data.courses_list.length && (
                <Typography variant="body2" color="text.secondary">Chưa có khóa học</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Xu hướng đào tạo theo tháng</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Tỷ lệ % người hoàn thành khóa học theo thời gian
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, n) => [`${Number(v ?? 0)}%`, String(n)]} />
            <Legend />
            <Line type="monotone" dataKey="Tỷ lệ hoàn thành (%)" stroke="#1565c0" strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Stack>
  );
}
