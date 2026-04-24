/**
 * Lightweight week-view calendar for exam rooms.
 * No external dependency: built with MUI Box + dayjs.
 */
import { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, IconButton, Stack, Typography, Tooltip, Chip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';

import type { ExamRoomResponse } from '@/api/examRoomApi';
import { getDynamicRoomStatus } from '@/utils/roomStatusHelper';

interface Props {
  rooms: ExamRoomResponse[];
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 06:00 - 18:00
const HOUR_HEIGHT = 48;
const HEADER_HEIGHT = 60;

const STATUS_BG_COLOR: Record<string, string> = {
  default: '#9e9e9e',
  info: '#1565c0', // scheduled
  warning: '#ed6c02', // pending/live warning
  primary: '#1976d2', // in progress
  success: '#2e7d32', // finished
  error: '#d32f2f', // cancelled/rejected
};

export default function ExamRoomCalendar({ rooms }: Props) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<Dayjs>(dayjs().startOf('week'));

  // Days of the displayed week (Mon-Sun)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => anchor.add(i, 'day')),
    [anchor],
  );

  // Group rooms by day-of-week index
  const roomsByDay = useMemo(() => {
    const map: Record<number, ExamRoomResponse[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const r of rooms) {
      const start = dayjs(r.scheduled_start);
      const idx = start.diff(anchor.startOf('day'), 'day');
      if (idx >= 0 && idx < 7) map[idx].push(r);
    }
    return map;
  }, [rooms, anchor]);

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Tuần {anchor.format('DD/MM')} – {anchor.add(6, 'day').format('DD/MM/YYYY')}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Tuần trước">
              <IconButton size="small" onClick={() => setAnchor(anchor.subtract(7, 'day'))}>
                <ChevronLeft />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tuần này">
              <IconButton size="small" onClick={() => setAnchor(dayjs().startOf('week'))}>
                <Today />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tuần sau">
              <IconButton size="small" onClick={() => setAnchor(anchor.add(7, 'day'))}>
                <ChevronRight />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Calendar grid */}
        <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {/* Hour gutter */}
          <Box sx={{ width: 56, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ height: HEADER_HEIGHT, borderBottom: '1px solid', borderColor: 'divider' }} />
            {HOURS.map((h) => (
              <Box
                key={h}
                sx={{
                  height: HOUR_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  pr: 0.5,
                  pt: 0.25,
                  borderBottom: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary">{h}:00</Typography>
              </Box>
            ))}
          </Box>

          {/* Day columns */}
          {days.map((d, i) => {
            const isToday = d.isSame(dayjs(), 'day');
            const dayRooms = roomsByDay[i];
            return (
              <Box
                key={i}
                sx={{
                  flex: 1, minWidth: 110,
                  borderRight: i < 6 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  position: 'relative',
                  bgcolor: isToday ? 'action.hover' : 'transparent',
                }}
              >
                {/* Day header */}
                <Box
                  sx={{
                    height: HEADER_HEIGHT,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    py: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {d.format('ddd')}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {d.format('DD')}
                  </Typography>
                </Box>

                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <Box
                    key={h}
                    sx={{
                      height: HOUR_HEIGHT,
                      borderBottom: '1px dashed',
                      borderColor: 'divider',
                    }}
                  />
                ))}

                {/* Room blocks (absolutely positioned) */}
                {dayRooms.map((r) => {
                  const start = dayjs(r.scheduled_start);
                  const end = dayjs(r.scheduled_end);
                  const startHourFloat = start.hour() + start.minute() / 60;
                  const endHourFloat = end.hour() + end.minute() / 60;
                  const top = HEADER_HEIGHT + (startHourFloat - HOURS[0]) * HOUR_HEIGHT;
                  const height = Math.max(20, (endHourFloat - startHourFloat) * HOUR_HEIGHT);
                  // Skip rooms entirely outside visible range
                  if (endHourFloat <= HOURS[0] || startHourFloat >= HOURS[HOURS.length - 1] + 1) return null;

                  const dyn = getDynamicRoomStatus(r);
                  return (
                    <Tooltip
                      key={r.id}
                      title={
                        <>
                          <strong>{r.name}</strong>
                          <br />
                          {start.format('HH:mm')} – {end.format('HH:mm')}
                          <br />
                          Trạng thái: {dyn.label}
                          <br />
                          {r.candidates.length}/{r.capacity} thí sinh
                        </>
                      }
                    >
                      <Box
                        onClick={() => navigate(`/admin/rooms/${r.id}`)}
                        sx={{
                          position: 'absolute',
                          top, height,
                          left: 4, right: 4,
                          bgcolor: STATUS_BG_COLOR[dyn.color] || '#9e9e9e',
                          color: 'white',
                          borderRadius: 1,
                          p: 0.5,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          fontSize: 11,
                          lineHeight: 1.2,
                          boxShadow: 1,
                          '&:hover': { opacity: 0.9 },
                        }}
                      >
                        <strong>{start.format('HH:mm')}</strong> {r.name}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        {/* Legend */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {Object.entries({
            'Chờ duyệt': '#ed6c02',
            'Đã lên lịch': '#1565c0',
            'Đang diễn ra': '#1976d2',
            'Đã kết thúc': '#2e7d32',
            'Đã huỷ': '#d32f2f',
          }).map(([k, c]) => (
            <Chip
              key={k} size="small"
              label={k}
              sx={{ bgcolor: c, color: 'white' }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
