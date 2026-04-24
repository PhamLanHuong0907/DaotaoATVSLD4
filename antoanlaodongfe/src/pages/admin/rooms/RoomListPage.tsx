import { useMemo, useState, useEffect } from 'react';
import {
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, MenuItem, Typography, Pagination,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, People, Print, ViewList, CalendarMonth, Search } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup, InputAdornment } from '@mui/material';
import ExamRoomCalendar from '@/components/exam/ExamRoomCalendar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useExamRooms, useDeleteExamRoom } from '@/hooks/useExamRooms';
import { examPeriodApi } from '@/api/examPeriodApi';
import { examRoomApi } from '@/api/examRoomApi';
import { departmentApi } from '@/api/departmentApi';
import type { ExamRoomStatus } from '@/types/enums';
import { examModeLabels, examRoomStatusLabels } from '@/utils/vietnameseLabels';
import { getDynamicRoomStatus } from '@/utils/roomStatusHelper';

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(examRoomStatusLabels).map(([v, l]) => ({ value: v, label: l })),
];

const modeOptions = [
  { value: '', label: 'Tất cả hình thức' },
  ...Object.entries(examModeLabels).map(([v, l]) => ({ value: v, label: l })),
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RoomListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();

  const periodId = searchParams.get('period_id') || '';
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [examMode, setExamMode] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 1. Fetching
  const { data: periods } = useQuery({
    queryKey: ['exam-periods', { page_size: 100 }],
    queryFn: () => examPeriodApi.list({ page_size: 100 }),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);

  // Fetch rooms with basic server filters
  const { data: rawData, isLoading } = useExamRooms({
    exam_period_id: periodId || undefined,
    department_id: departmentId || undefined,
    status: (status || undefined) as ExamRoomStatus | undefined,
    page, page_size: pageSize,
  });

  // Client-side Filter for Search and Mode
  const filteredRooms = useMemo(() => {
    if (!rawData?.items) return [];
    return rawData.items.filter((r) => {
      const matchSearch = debouncedSearch
        ? r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.location?.toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const matchMode = examMode ? r.exam_mode === examMode : true;
      return matchSearch && matchMode;
    });
  }, [rawData?.items, debouncedSearch, examMode]);

  const deleteMutation = useDeleteExamRoom();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      enqueueSnackbar('Đã xoá phòng thi', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
    setDeleteId(null);
  };

  const handlePrint = async (examId: string, roomName: string) => {
    try {
      const blob = await examRoomApi.printExamPdf(examId);
      downloadBlob(blob, `de-thi-${roomName}.pdf`);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title="Phòng thi"
        subtitle="Lịch các phòng thi theo kỳ thi và phòng ban"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate(`/admin/rooms/create${periodId ? `?period_id=${periodId}` : ''}`)}>
            Tạo phòng thi
          </Button>
        }
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <ToggleButtonGroup
            size="small" exclusive value={view}
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="list"><ViewList fontSize="small" sx={{ mr: 0.5 }} />Bảng</ToggleButton>
            <ToggleButton value="calendar"><CalendarMonth fontSize="small" sx={{ mr: 0.5 }} />Lịch</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            placeholder="Tìm kiếm phòng thi..."
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }
            }}
          />
          <TextField select size="small" label="Kỳ thi" value={periodId}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setSearchParams({ period_id: v });
              else setSearchParams({});
              setPage(1);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Tất cả kỳ thi</MenuItem>
            {periods?.items.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField select size="small" label="Phòng ban" value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            sx={{ minWidth: 200, flex: 1 }}
          >
            <MenuItem value="">Tất cả phòng ban</MenuItem>
            {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Hình thức" value={examMode}
            onChange={(e) => { setExamMode(e.target.value); setPage(1); }}
            sx={{ minWidth: 180 }}
          >
            {modeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Trạng thái" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            sx={{ minWidth: 180 }}
          >
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Stack>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !filteredRooms.length ? (
        <EmptyState message={rawData?.items.length ? "Không tìm thấy phòng thi khớp bộ lọc" : "Chưa có phòng thi nào"} />
      ) : view === 'calendar' ? (
        <ExamRoomCalendar rooms={filteredRooms} />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên phòng thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Hình thức</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bắt đầu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kết thúc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thí sinh</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRooms.map((r) => (
                  <TableRow key={r.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{r.name}</Typography>
                      {r.location && (
                        <Typography variant="caption" color="text.secondary">{r.location}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{deptMap[r.department_id]?.name || r.department_id}</TableCell>
                    <TableCell>{examModeLabels[r.exam_mode]}</TableCell>
                    <TableCell>{dayjs(r.scheduled_start).format('DD/MM/YYYY HH:mm')}</TableCell>
                    <TableCell>{dayjs(r.scheduled_end).format('DD/MM/YYYY HH:mm')}</TableCell>
                    <TableCell align="center">{r.candidates.length}/{r.capacity}</TableCell>
                    <TableCell align="center">
                      {(() => {
                        const dyn = getDynamicRoomStatus(r);
                        return <Chip size="small" label={dyn.label} color={dyn.color} />;
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Quản lý thí sinh">
                        <IconButton size="small" onClick={() => navigate(`/admin/rooms/${r.id}`)}>
                          <People fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {r.exam_mode === 'onsite' && (
                        <Tooltip title="In đề PDF">
                          <IconButton size="small" color="primary" onClick={() => handlePrint(r.exam_id || '', r.name)}>
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Sửa">
                        <IconButton size="small" onClick={() => navigate(`/admin/rooms/${r.id}/edit`)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xoá">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(r.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {rawData && rawData.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={rawData.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá phòng thi"
        message="Bạn có chắc chắn muốn xoá phòng thi này?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
