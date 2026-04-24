import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Stack, LinearProgress, Chip, Avatar,
  Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  EmojiEvents, Star, MenuBook, School, Login, Whatshot, WorkspacePremium,
} from '@mui/icons-material';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { gamificationApi, type Badge } from '@/api/gamificationApi';
import { useAuth } from '@/contexts/AuthContext';

const ICON_MAP: Record<string, React.ReactNode> = {
  EmojiEvents: <EmojiEvents />,
  Star: <Star />,
  MenuBook: <MenuBook />,
  School: <School />,
  Login: <Login />,
  Whatshot: <Whatshot />,
  WorkspacePremium: <WorkspacePremium />,
};

const REASON_LABELS: Record<string, string> = {
  exam_pass: 'Vượt qua kỳ thi',
  exam_excellent: 'Đạt loại xuất sắc',
  exam_perfect: 'Điểm tuyệt đối',
  lesson_complete: 'Hoàn thành bài học',
  course_complete: 'Hoàn thành khoá học',
  practical_pass: 'Đạt thi tay nghề',
  first_login: 'Đăng nhập lần đầu',
};

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <Card variant="outlined" sx={{ textAlign: 'center', height: '100%' }}>
      <CardContent>
        <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: 'warning.light', color: 'warning.dark' }}>
          {ICON_MAP[badge.icon] || <EmojiEvents />}
        </Avatar>
        <Typography variant="subtitle1" fontWeight={600}>{badge.title}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {badge.description}
        </Typography>
        <Chip size="small" label={dayjs(badge.awarded_at).format('DD/MM/YYYY')} variant="outlined" />
      </CardContent>
    </Card>
  );
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [scope, setScope] = useState<'all' | 'department'>('all');

  const { data: score } = useQuery({
    queryKey: ['my-score'],
    queryFn: () => gamificationApi.myScore(),
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard', scope, user?.department_id],
    queryFn: () => gamificationApi.leaderboard({
      department_id: scope === 'department' ? user?.department_id || undefined : undefined,
      limit: 50,
    }),
  });

  const nextLevelPoints = ((score?.level || 1)) * 100;
  const currentLevelPoints = ((score?.level || 1) - 1) * 100;
  const progressInLevel = score
    ? Math.round(((score.total_points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100)
    : 0;

  return (
    <>
      <PageHeader title="Thành tích & Bảng xếp hạng" subtitle="Điểm thưởng, huy hiệu và xếp hạng" />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 96, height: 96, mx: 'auto', mb: 1.5,
                  bgcolor: 'primary.main', fontSize: 36,
                }}
              >
                {score?.full_name.charAt(0) || 'U'}
              </Avatar>
              <Typography variant="h6">{score?.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">{score?.employee_id}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Star color="warning" />
                <Typography variant="subtitle1">Điểm thưởng</Typography>
              </Stack>
              <Typography variant="h2" fontWeight={700} color="warning.main">
                {score?.total_points || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cấp độ {score?.level || 1}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, progressInLevel))}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {(score?.total_points || 0) - currentLevelPoints} / {nextLevelPoints - currentLevelPoints} đến cấp {(score?.level || 1) + 1}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <EmojiEvents color="warning" />
                <Typography variant="subtitle1">Huy hiệu</Typography>
              </Stack>
              <Typography variant="h2" fontWeight={700} color="warning.main">
                {score?.badges.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                / 7 huy hiệu có thể đạt được
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Huy hiệu của tôi" icon={<EmojiEvents />} iconPosition="start" />
        <Tab label="Lịch sử điểm" icon={<Star />} iconPosition="start" />
        <Tab label="Bảng xếp hạng" icon={<WorkspacePremium />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Box>
          {(score?.badges.length || 0) === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Bạn chưa có huy hiệu nào. Hãy hoàn thành khoá học và đạt kỳ thi để nhận huy hiệu!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {score?.badges.map((b) => (
                <Grid key={b.code} size={{ xs: 6, sm: 4, md: 3 }}>
                  <BadgeCard badge={b} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Lý do</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Điểm</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(score?.history || []).slice().reverse().map((h, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Typography variant="caption">
                      {dayjs(h.created_at).format('DD/MM/YYYY HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>{REASON_LABELS[h.reason] || h.reason}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={`+${h.points}`} color="success" />
                  </TableCell>
                </TableRow>
              ))}
              {(score?.history || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="caption" color="text.secondary" sx={{ py: 3, display: 'block' }}>
                      Chưa có sự kiện nào
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 2 && (
        <>
          <Tabs value={scope} onChange={(_, v) => setScope(v)} sx={{ mb: 2 }}>
            <Tab value="all" label="Toàn công ty" />
            <Tab value="department" label="Phòng ban của tôi" disabled={!user?.department_id} />
          </Tabs>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={60} align="center" sx={{ fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Người lao động</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Cấp độ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Huy hiệu</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Tổng điểm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((l, i) => {
                  const isMe = l.user_id === user?.id;
                  return (
                    <TableRow key={l.user_id} sx={{ bgcolor: isMe ? 'primary.50' : undefined }}>
                      <TableCell align="center">
                        {i < 3 ? (
                          <Tooltip title={['Vàng', 'Bạc', 'Đồng'][i]}>
                            <EmojiEvents
                              fontSize="small"
                              sx={{ color: ['#FFD700', '#C0C0C0', '#CD7F32'][i] }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption">{i + 1}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>
                            {l.full_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={isMe ? 600 : 400}>
                              {l.full_name}
                              {isMe && <Chip label="Bạn" size="small" sx={{ ml: 1 }} color="primary" />}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {l.employee_id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={`Cấp ${l.level}`} />
                      </TableCell>
                      <TableCell align="center">{l.badge_count}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="warning.main">
                          {l.total_points}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {leaderboard.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="caption" color="text.secondary" sx={{ py: 3, display: 'block' }}>
                        Chưa có dữ liệu xếp hạng
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}
