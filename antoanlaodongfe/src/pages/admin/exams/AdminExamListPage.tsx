import { useState, useEffect, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem,
  Pagination, Skeleton, Chip, IconButton, Tooltip, Stack,
  InputAdornment,
} from '@mui/material';
import { Add, Quiz, Assignment, Delete, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useExams } from '@/hooks/useExams';
import { examApi } from '@/api/examApi';
import type { ExamType, ExamKind } from '@/types/enums';
import { examTypeLabels, examModeLabels } from '@/utils/vietnameseLabels';
import { formatDuration } from '@/utils/formatters';

const examTypeOptions = [
  { value: '', label: 'Tất cả loại thi' },
  ...Object.entries(examTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const examKindOptions = [
  { value: '', label: 'Tất cả hình thức' },
  { value: 'trial', label: 'Thi thử' },
  { value: 'official', label: 'Thi chính thức' },
];

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'upcoming', label: 'Chuẩn bị diễn ra' },
  { value: 'opening', label: 'Đang mở' },
  { value: 'closed', label: 'Đã đóng' },
];

const examKindChipProps = (kind?: ExamKind) => {
  if (kind === 'official') return { label: 'Chính thức', color: 'primary' as const };
  return { label: 'Thi thử', color: 'default' as const };
};

export default function AdminExamListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // 1. Filter States
  const [examType, setExamType] = useState('');
  const [examKind, setExamKind] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [occupation, setOccupation] = useState('');

  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  // 2. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Fetch Data
  const { data, isLoading } = useExams({
    exam_type: (examType || undefined) as ExamType | undefined,
    exam_kind: (examKind || undefined) as ExamKind | undefined,
    page,
    page_size: pageSize,
  });

  // 4. Client-side Filtering & Status Calculation
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((exam) => {
      // Calculate status based on period schedule
      let examStatus = '';
      if (exam.exam_kind === 'trial') {
        examStatus = exam.is_active ? 'opening' : 'closed';
      } else {
        const now = dayjs();
        const start = exam.scheduled_start ? dayjs(exam.scheduled_start) : null;
        const end = exam.scheduled_end ? dayjs(exam.scheduled_end) : null;

        if (start && now.isBefore(start)) {
          examStatus = 'upcoming';
        } else if (start && end && now.isAfter(start) && now.isBefore(end)) {
          examStatus = 'opening';
        } else if (end && now.isAfter(end)) {
          examStatus = 'closed';
        } else {
          examStatus = exam.is_active ? 'opening' : 'closed';
        }
      }

      const matchSearch = debouncedSearch ? exam.name.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
      const matchOccupation = occupation ? exam.occupation === occupation : true;
      const matchStatus = status ? examStatus === status : true;

      return matchSearch && matchOccupation && matchStatus;
    });
  }, [data?.items, debouncedSearch, occupation, status]);

  // 5. Unique Occupations for filter
  const occupationOptions = useMemo(() => {
    const occupations = data?.items.map((e) => e.occupation).filter(Boolean) || [];
    const unique = Array.from(new Set(occupations));
    return [{ value: '', label: 'Tất cả nghề' }, ...unique.map((o) => ({ value: o, label: o }))];
  }, [data?.items]);

  const deleteMutation = useMutation({
    mutationFn: examApi.delete,
    onSuccess: () => {
      enqueueSnackbar('Đã xóa kỳ thi', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setDeleteId(null);
    },
    onError: () => {
      enqueueSnackbar('Lỗi khi xóa', { variant: 'error' });
      setDeleteId(null);
    },
  });

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Quản lý đề thi"
        subtitle="Danh sách các đề thi đã tạo"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/exams/generate')}>
            Tạo đề thi mới
          </Button>
        }
      />

      <Stack direction="row"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}>
        <TextField
          placeholder="Tìm kiếm đề thi..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 400 }}
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

        <TextField
          select size="small" label="Loại kỳ thi" value={examKind}
          onChange={handleFilterChange(setExamKind)}
          sx={{ minWidth: 150 }}
        >
          {examKindOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Loại thi" value={examType}
          onChange={handleFilterChange(setExamType)}
          sx={{ minWidth: 180 }}
        >
          {examTypeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Trạng thái" value={status}
          onChange={handleFilterChange(setStatus)}
          sx={{ minWidth: 180 }}
        >
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select size="small" label="Ngành nghề" value={occupation}
          onChange={handleFilterChange(setOccupation)}
          sx={{ minWidth: 180 }}
        >
          {occupationOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !filteredItems.length ? (
        <EmptyState
          message="Không tìm thấy đề thi phù hợp với bộ lọc."
          action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/exams/generate')} sx={{ mt: 2 }}>Tạo đề thi đầu tiên</Button>}
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên đề thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Hình thức</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Số câu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((exam) => {
                  const kindProps = examKindChipProps(exam.exam_kind);
                  const isTrial = exam.exam_kind === 'trial';

                  // Calculate status for UI Chip
                  let statusColor: 'success' | 'warning' | 'default' = 'default';
                  let statusLabel = '';

                  if (isTrial) {
                    statusLabel = exam.is_active ? 'Đang mở' : 'Đã đóng';
                    statusColor = exam.is_active ? 'success' : 'default';
                  } else {
                    const now = dayjs();
                    const start = exam.scheduled_start ? dayjs(exam.scheduled_start) : null;
                    const end = exam.scheduled_end ? dayjs(exam.scheduled_end) : null;

                    if (start && now.isBefore(start)) {
                      statusLabel = 'Sắp diễn ra';
                      statusColor = 'warning';
                    } else if (start && end && now.isAfter(start) && now.isBefore(end)) {
                      statusLabel = 'Đang mở';
                      statusColor = 'success';
                    } else if (end && now.isAfter(end)) {
                      statusLabel = 'Đã đóng';
                      statusColor = 'default';
                    } else {
                      statusLabel = exam.is_active ? 'Đang mở' : 'Đã đóng';
                      statusColor = exam.is_active ? 'success' : 'default';
                    }
                  }

                  return (
                    <TableRow key={exam.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{exam.name}</Typography>
                        {exam.exam_period_name && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Kỳ thi: {exam.exam_period_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip label={examTypeLabels[exam.exam_type]} size="small" variant="outlined" />
                          <Chip label={kindProps.label} size="small" color={kindProps.color} />
                        </Stack>
                      </TableCell>
                      <TableCell>{examModeLabels[exam.exam_mode] || exam.exam_mode}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{exam.occupation} — Bậc {exam.skill_level}</Typography>
                      </TableCell>
                      <TableCell align="center">{exam.total_questions}</TableCell>
                      <TableCell>{formatDuration(exam.duration_minutes)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={statusLabel}
                          size="small"
                          color={statusColor}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Xem câu hỏi">
                            <IconButton size="small" color="primary" onClick={() => navigate(`/admin/exams/${exam.id}`)}>
                              <Quiz fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xem bài nộp">
                            <IconButton size="small" color="secondary" onClick={() => navigate(`/admin/exams/${exam.id}/submissions`)}>
                              <Assignment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={() => setDeleteId(exam.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data && data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Xóa kỳ thi"
        message="Bạn có chắc chắn muốn xóa kỳ thi này? Thao tác không thể hoàn tác."
        confirmText="Xóa"
        confirmColor="error"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
