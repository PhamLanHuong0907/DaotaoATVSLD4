import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  MenuItem,
  Pagination,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Add, Visibility, Edit, Delete, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useExamTemplates, useDeleteTemplate } from '@/hooks/useExamTemplates';
import { occupationApi } from '@/api/catalogApi';
import type { Occupation } from '@/api/catalogApi';
import type { ExamType, ApprovalStatus } from '@/types/enums';
import { examTypeLabels, approvalStatusLabels } from '@/utils/vietnameseLabels';
import { formatDuration } from '@/utils/formatters';

const examTypeOptions = [
  { value: '', label: 'Tất cả loại thi' },
  ...Object.entries(examTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l })),
];

const skillLevelOptions = [
  { value: '', label: 'Tất cả bậc' },
  ...Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `Bậc ${i + 1}` })),
];

export default function TemplateListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // 1. Filter States
  const [examType, setExamType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [occupation, setOccupation] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  // 2. Fetch Catalog Occupations
  const { data: occupationsData } = useQuery({
    queryKey: ['occupations', 'all'],
    queryFn: () => occupationApi.list(false),
  });

  const occupationOptions = useMemo(() => [
    { value: '', label: 'Tất cả ngành nghề' },
    ...(occupationsData?.map((o: Occupation) => ({ value: o.name, label: o.name })) ?? []),
  ], [occupationsData]);

  // 3. Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 4. Fetch Data
  const { data, isLoading } = useExamTemplates({
    exam_type: (examType || undefined) as ExamType | undefined,
    status: (status || undefined) as ApprovalStatus | undefined,
    page,
    page_size: pageSize,
  });

  // 5. Client-side Filtering
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((tpl) => {
      const matchSearch = debouncedSearch
        ? tpl.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const matchOccupation = occupation ? tpl.occupation === occupation : true;
      const matchSkillLevel = skillLevel ? String(tpl.skill_level) === skillLevel : true;

      return matchSearch && matchOccupation && matchSkillLevel;
    });
  }, [data?.items, debouncedSearch, occupation, skillLevel]);

  const deleteMutation = useDeleteTemplate();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      enqueueSnackbar('Đã xoá mẫu đề thi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
    setDeleteId(null);
  };

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Quản lý mẫu đề thi"
        subtitle="Tạo và quản lý cấu trúc đề thi"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/templates/create')}>
            Tạo mẫu mới
          </Button>
        }
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Tìm kiếm mẫu đề thi..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            sx={{ minWidth: 150 }}
          >
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Stack>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField select size="small" label="Ngành nghề" value={occupation} onChange={handleFilterChange(setOccupation)} sx={{ flex: '1 1 200px' }}>
            {occupationOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Bậc thợ" value={skillLevel} onChange={handleFilterChange(setSkillLevel)} sx={{ flex: '1 1 150px' }}>
            {skillLevelOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Box>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !filteredItems.length ? (
        <EmptyState
          message="Không tìm thấy mẫu đề thi phù hợp với bộ lọc."
          action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/templates/create')} sx={{ mt: 2 }}>Tạo mẫu đầu tiên</Button>}
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên mẫu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Bậc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Số câu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((tpl) => (
                  <TableRow key={tpl.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{tpl.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{examTypeLabels[tpl.exam_type]}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tpl.occupation}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={`Bậc ${tpl.skill_level}`} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell align="center">{tpl.total_questions}</TableCell>
                    <TableCell>{formatDuration(tpl.duration_minutes)}</TableCell>
                    <TableCell align="center">
                      <StatusChip status={tpl.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="Xem">
                          <IconButton size="small" onClick={() => navigate(`/admin/templates/${tpl.id}`)}>
                            <Visibility fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sửa">
                          <IconButton size="small" onClick={() => navigate(`/admin/templates/${tpl.id}/edit`)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xoá">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(tpl.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
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

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá mẫu đề thi"
        message="Bạn có chắc chắn muốn xoá mẫu đề thi này? Thao tác không thể hoàn tác."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}