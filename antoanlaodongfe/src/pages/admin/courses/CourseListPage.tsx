import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip,
  InputAdornment,
} from '@mui/material';
import { Delete, Visibility, Search, Sort, CalendarToday } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { courseApi, type CourseResponse, type CourseListFilters } from '@/api/courseApi';
import { occupationApi } from '@/api/catalogApi';
import type { Occupation } from '@/api/catalogApi';
import type { ApprovalStatus, TrainingGroup } from '@/types/enums';
import { approvalStatusLabels, trainingGroupLabels } from '@/utils/vietnameseLabels';
import { formatDateTime } from '@/utils/formatters';

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l })),
];

const groupOptions = [
  { value: '', label: 'Tất cả nhóm' },
  ...Object.entries(trainingGroupLabels).map(([v, l]) => ({ value: v, label: l })),
];

const sortOptions = [
  { value: 'created_at_desc', label: 'Mới nhất' },
  { value: 'title_asc', label: 'Tên A - Z' },
  { value: 'skill_level_asc', label: 'Bậc (Thấp - Cao)' },
  { value: 'skill_level_desc', label: 'Bậc (Cao - Thấp)' },
];

const years = ['', '2024', '2025', '2026'];
const months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export default function CourseListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  // 1. Filter & Sort States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [occupation, setOccupation] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: occupationsData } = useQuery({
    queryKey: ['occupations', 'all'],
    queryFn: () => occupationApi.list(false),
  });

  const occupationOptions = useMemo(() => [
    { value: '', label: 'Tất cả ngành nghề' },
    ...(occupationsData?.map((o: Occupation) => ({ value: o.name, label: o.name })) ?? []),
  ], [occupationsData]);

  // 2. Effect xử lý Debounce cho Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Build params (Vẫn gửi lên BE để dự phòng sau này BE có xử lý)
  const queryParams: CourseListFilters = {
    page,
    page_size: pageSize,
  };

  // 4. Fetch Data (Chỉ phụ thuộc vào page và sort, vì các filter khác ta tự xử lý nội bộ)
  const { data, isLoading } = useQuery({
    queryKey: ['courses', queryParams],
    queryFn: () => courseApi.list(queryParams),
  });

  // 5. CLIENT-SIDE FILTERING: Tự động tách năm, tháng từ created_at và lọc bằng JavaScript
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((course: CourseResponse) => {
      // Ép kiểu thời gian created_at thành Date object để lấy năm, tháng
      const courseDate = new Date(course.created_at);
      const courseYear = courseDate.getFullYear().toString();
      const courseMonth = (courseDate.getMonth() + 1).toString(); // getMonth() trả về 0-11 nên phải +1

      // Kiểm tra từng điều kiện lọc
      const matchYear = year ? courseYear === year : true;
      const matchMonth = month ? courseMonth === month : true;
      const matchSearch = debouncedSearch ? course.title.toLowerCase().includes(debouncedSearch.toLowerCase()) : true;
      const matchOccupation = occupation ? course.occupation === occupation : true;
      const matchGroup = group ? course.training_group === group : true;
      const matchStatus = status ? course.status === status : true;

      // Chỉ giữ lại khóa học thoả mãn TẤT CẢ các điều kiện trên
      return matchYear && matchMonth && matchSearch && matchOccupation && matchGroup && matchStatus;
    });
  }, [data, year, month, debouncedSearch, occupation, group, status]); // Chạy lại hàm filter khi các biến này đổi

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      enqueueSnackbar('Đã xoá khóa học', { variant: 'success' });
    },
  });

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Quản lý khóa học" subtitle="Danh sách khóa học huấn luyện ATVSLĐ" />

      {/* Filters & Search Toolbar */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Tìm kiếm khóa học..."
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
            select
            size="small"
            label="Sắp xếp"
            value={sortBy}
            onChange={handleFilterChange(setSortBy)}
            sx={{ minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Sort fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }
            }}
          >
            {sortOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </Stack>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField select size="small" label="Nhóm huấn luyện" value={group} onChange={handleFilterChange(setGroup)} sx={{ flex: '1 1 200px' }}>
            {groupOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Ngành nghề" value={occupation} onChange={handleFilterChange(setOccupation)} sx={{ flex: '1 1 180px' }}>
            {occupationOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Năm" value={year} onChange={handleFilterChange(setYear)} sx={{ flex: '1 1 120px' }}
            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><CalendarToday sx={{ fontSize: 16 }} color="action" /></InputAdornment>) } }}>
            {years.map((y) => <MenuItem key={y} value={y}>{y || 'Tất cả'}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Tháng" value={month} onChange={handleFilterChange(setMonth)} sx={{ flex: '1 1 120px' }}>
            {months.map((m) => <MenuItem key={m} value={m}>{m ? `Tháng ${m}` : 'Tất cả'}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Trạng thái" value={status} onChange={handleFilterChange(setStatus)} sx={{ flex: '1 1 160px' }}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
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
        <EmptyState message="Không tìm thấy khóa học nào phù hợp với bộ lọc." />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ width: 10 }} />
                  <TableCell sx={{ fontWeight: 600 }}>Tên khóa học</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Bậc thợ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nhóm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Số bài</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* SỬ DỤNG filteredItems THAY VÌ data.items Ở ĐÂY */}
                {filteredItems.map((course: CourseResponse) => (
                  <TableRow key={course.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell />
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{course.title}</Typography>
                    </TableCell>
                    <TableCell>{course.occupation}</TableCell>
                    <TableCell align="center">
                      <Chip label={`Bậc ${course.skill_level}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{trainingGroupLabels[course.training_group as TrainingGroup] || course.training_group}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDateTime(course.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {course.lesson_count ?? course.lessons?.length ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center"><StatusChip status={course.status as ApprovalStatus} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xoá">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(course.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data && data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.total_pages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá khóa học"
        message="Bạn có chắc chắn muốn xoá khóa học này? Thao tác không thể hoàn tác."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}