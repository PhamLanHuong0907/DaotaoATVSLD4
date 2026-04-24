import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Chip, Stack, Typography, Button, Paper, Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AccessTime, LocationOn, PlayArrow, EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { examRoomApi } from '@/api/examRoomApi';
import { examModeLabels } from '@/utils/vietnameseLabels';
import type { ExamRoomResponse } from '@/api/examRoomApi';
import { getDynamicRoomStatus } from '@/utils/roomStatusHelper';

function getRoomState(room: ExamRoomResponse) {
  const now = dayjs();
  const start = dayjs(room.scheduled_start);
  const end = dayjs(room.scheduled_end);
  if (now.isBefore(start)) return { state: 'upcoming' as const, label: `Bắt đầu sau ${start.diff(now, 'minute')} phút` };
  if (now.isAfter(end)) return { state: 'ended' as const, label: 'Đã kết thúc' };
  return { state: 'live' as const, label: `Còn ${end.diff(now, 'minute')} phút` };
}

function RoomList({ rooms }: { rooms: ExamRoomResponse[] }) {
  const navigate = useNavigate();

  if (rooms.length === 0) {
    return <EmptyState message="Bạn không có bài thi chính thức nào sắp tới" />;
  }

  return (
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
                    label={getDynamicRoomStatus(room).label}
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

                {room.certificate_type_id && (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                    <EmojiEvents fontSize="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">
                      Có cấp chứng chỉ{room.certificate_passing_score ? ` (điểm đạt ≥ ${room.certificate_passing_score})` : ''}
                    </Typography>
                  </Stack>
                )}

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
  );
}

export default function OfficialExamListPage() {
  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: () => examRoomApi.mySchedule(true),
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Danh sách bài thi chính thức"
        subtitle="Các kỳ thi sát hạch bạn tham gia"
      />

      {loadingRooms ? (
        <Paper sx={{ p: 4 }}><Typography>Đang tải...</Typography></Paper>
      ) : (
        <RoomList rooms={rooms} />
      )}
    </>
  );
}
