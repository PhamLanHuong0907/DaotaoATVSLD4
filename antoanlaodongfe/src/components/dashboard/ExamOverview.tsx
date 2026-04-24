import { useState, useMemo } from 'react';
import {
  Grid, Paper, Stack, Typography, Box, Select, MenuItem, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import {
  ClipboardCheck, UserCheck, UserX, AlertTriangle, Trophy, TrendingUp,
  Users, DoorOpen, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import StatCard from './StatCard';
import type { DashboardExtendedResponse, ExamDashboardItem } from '@/api/reportApi';

const SCORE_COLORS = ['#c62828', '#f57c00', '#fbc02d', '#1565c0', '#2e7d32'];

interface Props {
  data: DashboardExtendedResponse;
}

export default function ExamOverview({ data }: Props) {
  const [selectedExamId, setSelectedExamId] = useState<string>(data.exams_list[0]?.id || '');
  const [drillTab, setDrillTab] = useState<'all' | 'dept'>('all');
  const [listTab, setListTab] = useState<'rooms' | 'departments'>('rooms');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const exam: ExamDashboardItem | undefined = useMemo(
    () => data.exams_list.find((e) => e.id === selectedExamId),
    [data.exams_list, selectedExamId],
  );

  const openExams = data.exams_list.length;
  const totalPassed = data.exams_list.reduce((s, e) => s + e.passed, 0);
  const totalCandidates = data.total_submissions;
  const failed = totalCandidates - totalPassed;

  const lineData = data.trend_12_months.map((t) => ({
    name: t.label,
    'Tỉ lệ đạt (%)': t.pass_rate,
  }));
  const barCandidateData = data.exams_list.map((e) => ({
    name: e.name.length > 18 ? e.name.slice(0, 16) + '…' : e.name,
    'Thí sinh': e.totalCandidates,
  }));

  const passRate = exam && exam.totalCandidates > 0
    ? ((exam.passed / exam.totalCandidates) * 100).toFixed(1) : '0';

  const selectedDept = useMemo(() => {
    if (!exam) return null;
    return exam.departments.find((d) => d.id === selectedDeptId) || exam.departments[0] || null;
  }, [exam, selectedDeptId]);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Tổng quan kỳ thi</Typography>
        <Typography variant="body2" color="text.secondary">
          Thống kê chung về các đề thi và kết quả
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard icon={ClipboardCheck} title="Đề thi đang mở" value={openExams}
            subtitle={`${totalCandidates} lượt nộp`} variant="accent" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={UserCheck} title="Đạt" value={totalPassed}
            subtitle={`${data.pass_rate}% tỉ lệ đạt`} variant="default" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatCard icon={UserX} title="Không đạt" value={failed} variant="destructive" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TrendingUp size={20} color="#1565c0" />
              <Typography variant="subtitle1" fontWeight={600}>Tỉ lệ đạt qua từng tháng</Typography>
            </Stack>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Tỉ lệ đạt (%)" stroke="#2e7d32" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Users size={20} color="#f57c00" />
              <Typography variant="subtitle1" fontWeight={600}>Số lượng thí sinh từng đề</Typography>
            </Stack>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barCandidateData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Thí sinh" fill="#1565c0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ height: 1, bgcolor: 'divider' }} />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={700}>Chi tiết đề thi</Typography>
          <Typography variant="body2" color="text.secondary">Xem chi tiết từng đề thi</Typography>
        </Box>
        <Select size="small" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}
          sx={{ minWidth: 240 }}>
          {data.exams_list.map((e) => (
            <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
          ))}
        </Select>
      </Stack>

      {exam ? (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard icon={DoorOpen} title="Số phòng thi" value={exam.rooms.length}
                subtitle={`${exam.totalCandidates} thí sinh`} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard icon={UserCheck} title="Tỉ lệ đạt" value={`${passRate}%`}
                subtitle={`${exam.passed}/${exam.totalCandidates}`} variant="accent" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard icon={AlertTriangle} title="Điểm TB" value={exam.averageScore}
                subtitle="Trung bình đề" variant="warning" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard icon={Building2} title="Phòng ban tham gia" value={exam.departments.length} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Phân bố điểm</Typography>
                  <Tabs value={drillTab} onChange={(_, v) => setDrillTab(v)}
                    sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5 } }}>
                    <Tab value="all" label="Tổng" />
                    <Tab value="dept" label="Phòng ban" />
                  </Tabs>
                </Stack>

                {drillTab === 'all' ? (
                  exam.scoreDistribution.reduce((s, b) => s + b.count, 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={exam.scoreDistribution} dataKey="count" nameKey="range"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                          {exam.scoreDistribution.map((_, i) => (
                            <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${Number(v ?? 0)} thí sinh`, String(n)]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyBox />
                  )
                ) : (
                  <>
                    <Select size="small"
                      value={selectedDept?.id || ''}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      sx={{ mb: 2, minWidth: 200 }}>
                      {exam.departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                      ))}
                    </Select>
                    {selectedDept ? (
                      <>
                        <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                          <Typography variant="caption">Thí sinh: <b>{selectedDept.totalCandidates}</b></Typography>
                          <Typography variant="caption">Điểm TB: <b>{selectedDept.averageScore || '—'}</b></Typography>
                          <Typography variant="caption" color="success.main">
                            Tỉ lệ đạt: <b>
                              {selectedDept.totalCandidates
                                ? ((selectedDept.passed / selectedDept.totalCandidates) * 100).toFixed(1)
                                : 0}%
                            </b>
                          </Typography>
                        </Stack>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={selectedDept.scoreDistribution} dataKey="count" nameKey="range"
                              cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                              {selectedDept.scoreDistribution.map((_, i) => (
                                <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </>
                    ) : <EmptyBox />}
                  </>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Tabs value={listTab} onChange={(_, v) => setListTab(v)} sx={{ mb: 2 }}>
                  <Tab value="rooms" icon={<DoorOpen size={16} />} iconPosition="start" label="Phòng thi" />
                  <Tab value="departments" icon={<Building2 size={16} />} iconPosition="start" label="Phòng ban" />
                </Tabs>
                {listTab === 'rooms' ? (
                  <Stack spacing={1} sx={{ maxHeight: 260, overflowY: 'auto' }}>
                    {exam.rooms.map((room) => {
                      const rate = room.candidates ? Math.round((room.passed / room.candidates) * 100) : 0;
                      return (
                        <Box key={room.id} sx={{
                          py: 1, px: 1.5, borderRadius: 2, bgcolor: '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <Typography variant="body2" fontWeight={500}>{room.name}</Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {room.candidates}/{room.capacity} TS
                            </Typography>
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              {rate}% đạt
                            </Typography>
                            <Box sx={{ width: 60, height: 6, bgcolor: '#e2e8f0', borderRadius: 1 }}>
                              <Box sx={{
                                height: '100%',
                                width: `${Math.min(100, (room.candidates / Math.max(room.capacity, 1)) * 100)}%`,
                                bgcolor: 'primary.main', borderRadius: 1,
                              }} />
                            </Box>
                          </Stack>
                        </Box>
                      );
                    })}
                    {!exam.rooms.length && <EmptyBox />}
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ maxHeight: 260, overflowY: 'auto' }}>
                    {exam.departments.map((d) => {
                      const rate = d.totalCandidates ? Math.round((d.passed / d.totalCandidates) * 100) : 0;
                      return (
                        <Box key={d.id} sx={{
                          py: 1, px: 1.5, borderRadius: 2, bgcolor: '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <Typography variant="body2" fontWeight={500}>{d.name}</Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {d.totalCandidates} TS
                            </Typography>
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              {rate}% đạt
                            </Typography>
                            <Box sx={{ width: 60, height: 6, bgcolor: '#e2e8f0', borderRadius: 1 }}>
                              <Box sx={{ height: '100%', width: `${rate}%`, bgcolor: 'primary.main', borderRadius: 1 }} />
                            </Box>
                          </Stack>
                        </Box>
                      );
                    })}
                    {!exam.departments.length && <EmptyBox />}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>

          {exam.topCandidates.length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Trophy size={20} color="#f57c00" />
                <Typography variant="subtitle1" fontWeight={600}>Thí sinh nổi bật</Typography>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng</TableCell>
                    <TableCell>Họ và tên</TableCell>
                    <TableCell>Mã NV</TableCell>
                    <TableCell align="right">Điểm</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exam.topCandidates.map((c, i) => (
                    <TableRow key={c.user_id}>
                      <TableCell>
                        <Box sx={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: '50%', fontWeight: 700, fontSize: 12,
                          bgcolor: i === 0 ? 'rgba(245,124,0,0.15)' : i === 1 ? '#e2e8f0' : 'rgba(46,125,50,0.12)',
                          color: i === 0 ? '#f57c00' : i === 1 ? '#475569' : '#2e7d32',
                        }}>
                          {i + 1}
                        </Box>
                      </TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.employee_id}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {c.score}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">Chưa có đề thi</Typography>
      )}
    </Stack>
  );
}

function EmptyBox() {
  return (
    <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="body2" color="text.secondary">Chưa có dữ liệu</Typography>
    </Box>
  );
}
