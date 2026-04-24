import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Chip, Stack, Typography, Button, Paper, Divider, Tabs, Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AccessTime, LocationOn, PlayArrow } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { examRoomApi } from '@/api/examRoomApi';
import { examModeLabels, examRoomStatusLabels } from '@/utils/vietnameseLabels';
import type { ExamRoomResponse } from '@/api/examRoomApi';
import MyExamScheduleCalendar from './MyExamScheduleCalendar';

function getRoomState(room: ExamRoomResponse) {
  const now = dayjs();
  const start = dayjs(room.scheduled_start);
  const end = dayjs(room.scheduled_end);
  if (now.isBefore(start)) return { state: 'upcoming' as const, label: `Bắt đầu sau ${start.diff(now, 'minute')} phút` };
  if (now.isAfter(end)) return { state: 'ended' as const, label: 'Đã kết thúc' };
  return { state: 'live' as const, label: `Còn ${end.diff(now, 'minute')} phút` };
}

export default function MySchedulePage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: () => examRoomApi.mySchedule(true),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Lịch thi của tôi"
        subtitle="Các phòng thi sắp diễn ra mà bạn được xếp vào"
      />

      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 2 }}>
        <Tab value="list" label="Danh sách" />
        <Tab value="calendar" label="Lịch tuần/tháng" />
      </Tabs>

      {view === 'calendar' ? (
        <MyExamScheduleCalendar />
      ) : isLoading ? (
        <Paper sx={{ p: 4 }}><Typography>Đang tải...</Typography></Paper>
      ) : rooms.length === 0 ? (
        <EmptyState message="Bạn chưa có lịch thi nào sắp tới" />
      ) : (
        <Grid container spacing={2}>
          {rooms.map((room) => {
            const st = getRoomState(room);
            const canEnter = st.state === 'live' && room.exam_mode === 'online';
            return (
              <Grid key={room.id} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6">{room.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {examModeLabels[room.exam_mode]}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={examRoomStatusLabels[room.status]}
                        color={st.state === 'live' ? 'warning' : st.state === 'upcoming' ? 'info' : 'default'}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2">
                          {dayjs(room.scheduled_start).format('DD/MM/YYYY HH:mm')} — {dayjs(room.scheduled_end).format('HH:mm')}
                        </Typography>
                      </Stack>
                      {room.location && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">{room.location}</Typography>
                        </Stack>
                      )}
                      <Typography variant="caption" color="primary" sx={{ mt: 0.5 }}>
                        {st.label}
                      </Typography>
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      {room.exam_mode === 'online' ? (
                        <Button
                          fullWidth variant="contained" startIcon={<PlayArrow />}
                          disabled={!canEnter}
                          onClick={() => navigate(`/exams/${room.exam_id}/take?room=${room.id}`)}
                        >
                          {canEnter ? 'Vào thi ngay' : 'Chưa đến giờ thi'}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Hình thức thi trực tiếp. Vui lòng có mặt tại địa điểm đúng giờ.
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
