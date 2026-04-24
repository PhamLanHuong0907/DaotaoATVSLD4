import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Paper, Stack, Typography, IconButton, ToggleButton, ToggleButtonGroup,
  Chip, Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { examRoomApi, type ExamRoomResponse } from '@/api/examRoomApi';

type ViewMode = 'week' | 'month';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function MyExamScheduleCalendar() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const navigate = useNavigate();

  const { data: rooms = [] } = useQuery({
    queryKey: ['my-schedule', 'all'],
    queryFn: () => examRoomApi.mySchedule(false),
    refetchInterval: 60_000,
  });

  const { startDate, endDate, cells } = useMemo(() => buildGrid(anchor, mode), [anchor, mode]);
  const eventsByDay = useMemo(() => groupByDay(rooms, startDate, endDate), [rooms, startDate, endDate]);

  const title = mode === 'week'
    ? `Tuần: ${startDate.format('DD/MM')} — ${endDate.format('DD/MM/YYYY')}`
    : anchor.format('MM/YYYY');

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={() => setAnchor(anchor.subtract(1, mode))}><ChevronLeft /></IconButton>
          <Typography variant="h6" sx={{ minWidth: 220, textAlign: 'center' }}>{title}</Typography>
          <IconButton size="small" onClick={() => setAnchor(anchor.add(1, mode))}><ChevronRight /></IconButton>
          <IconButton size="small" onClick={() => setAnchor(dayjs())}><Today /></IconButton>
        </Stack>
        <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="week">Tuần</ToggleButton>
          <ToggleButton value="month">Tháng</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {DAY_LABELS.map((l) => (
          <Box key={l} sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary', py: 1 }}>
            {l}
          </Box>
        ))}

        {cells.map((day) => {
          const key = day.format('YYYY-MM-DD');
          const events = eventsByDay[key] || [];
          const isToday = day.isSame(dayjs(), 'day');
          const inMonth = mode === 'month' ? day.month() === anchor.month() : true;
          return (
            <Box key={key}
              sx={{
                border: 1, borderColor: isToday ? 'primary.main' : 'divider',
                borderRadius: 1, p: 1, minHeight: mode === 'week' ? 140 : 100,
                bgcolor: inMonth ? 'background.paper' : '#f8fafc',
                opacity: inMonth ? 1 : 0.6,
              }}>
              <Typography variant="caption" sx={{
                fontWeight: isToday ? 700 : 500,
                color: isToday ? 'primary.main' : 'text.secondary',
              }}>
                {day.format('DD/MM')}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {events.slice(0, mode === 'week' ? 5 : 3).map((r) => (
                  <Tooltip key={r.id} title={`${r.name} · ${dayjs(r.scheduled_start).format('HH:mm')}—${dayjs(r.scheduled_end).format('HH:mm')}`}>
                    <Chip
                      size="small" clickable
                      label={`${dayjs(r.scheduled_start).format('HH:mm')} ${r.name}`}
                      onClick={() => navigate(`/exams/${r.exam_id}/take?room=${r.id}`)}
                      sx={{
                        bgcolor: r.exam_mode === 'online' ? '#e3f2fd' : '#fff3e0',
                        maxWidth: '100%',
                        justifyContent: 'flex-start',
                        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                      }}
                    />
                  </Tooltip>
                ))}
                {events.length > (mode === 'week' ? 5 : 3) && (
                  <Typography variant="caption" color="text.secondary">
                    +{events.length - (mode === 'week' ? 5 : 3)} khác
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

function buildGrid(anchor: Dayjs, mode: ViewMode) {
  if (mode === 'week') {
    // Monday-based week
    const start = anchor.startOf('week').add(1, 'day'); // dayjs startOf('week') is Sunday → +1
    const cells = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
    return { startDate: cells[0], endDate: cells[6], cells };
  }
  // month view: 6 rows × 7 cols
  const firstOfMonth = anchor.startOf('month');
  // Monday of the week containing firstOfMonth
  const offsetToMon = (firstOfMonth.day() + 6) % 7; // 0 if Mon
  const gridStart = firstOfMonth.subtract(offsetToMon, 'day');
  const cells = Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  return { startDate: gridStart, endDate: cells[41], cells };
}

function groupByDay(rooms: ExamRoomResponse[], start: Dayjs, end: Dayjs) {
  const map: Record<string, ExamRoomResponse[]> = {};
  for (const r of rooms) {
    const d = dayjs(r.scheduled_start);
    if (d.isBefore(start.startOf('day')) || d.isAfter(end.endOf('day'))) continue;
    const key = d.format('YYYY-MM-DD');
    (map[key] ||= []).push(r);
  }
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start)));
  return map;
}
