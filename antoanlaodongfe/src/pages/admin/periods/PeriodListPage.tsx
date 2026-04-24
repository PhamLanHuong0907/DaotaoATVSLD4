import { useState } from 'react';
import {
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, MenuItem, Typography, Pagination,
  IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { CheckCircleOutline, CancelOutlined } from '@mui/icons-material'; // Thêm icon này
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // Thêm Dialog
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useExamPeriods, useDeleteExamPeriod } from '@/hooks/useExamPeriods';
import type { ExamType, ExamPeriodStatus } from '@/types/enums';
import { examTypeLabels, examPeriodStatusLabels } from '@/utils/vietnameseLabels';
import { examPeriodApi } from '@/api/examPeriodApi';

const typeOptions = [{ value: '', label: 'Tất cả' }, ...Object.entries(examTypeLabels).map(([v, l]) => ({ value: v, label: l }))];
const statusOptions = [{ value: '', label: 'Tất cả' }, ...Object.entries(examPeriodStatusLabels).map(([v, l]) => ({ value: v, label: l }))];

const statusColor: Record<ExamPeriodStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  scheduled: 'info',
  in_progress: 'warning',
  finished: 'success',
  cancelled: 'error',
};

export default function PeriodListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [examType, setExamType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;
  const [reviewModal, setReviewModal] = useState<{ open: boolean, id: string | null, type: 'approve' | 'reject' }>({ open: false, id: null, type: 'approve' });
  const [rejectReason, setRejectReason] = useState('');

  const qc = useQueryClient();
  const { data, isLoading } = useExamPeriods({
    exam_type: (examType || undefined) as ExamType | undefined,
    status: (status || undefined) as ExamPeriodStatus | undefined,
    page, page_size: pageSize,
  });
  const deleteMutation = useDeleteExamPeriod();
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => examPeriodApi.update(id, payload), // Đổi lại đúng hàm gọi API của bạn
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-periods'] });
      enqueueSnackbar('Đã cập nhật trạng thái', { variant: 'success' });
      setReviewModal({ open: false, id: null, type: 'approve' });
      setRejectReason('');
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' })
  });
  // Hàm tính trạng thái động dựa trên thời gian
  const getDynamicStatus = (period: any): ExamPeriodStatus => {
    const now = dayjs();
    const start = dayjs(period.start_date);
    const end = dayjs(period.end_date);

    // Nếu bị từ chối duyệt -> Đã hủy
    if (period.status === 'cancelled') return 'cancelled';

    // Nếu chưa duyệt -> Nháp
    if (period.status === 'draft') return 'draft';

    // Nếu đã duyệt (dưới DB lưu là scheduled), ta tính tiếp thời gian hiện tại
    if (period.status === 'scheduled') {
      if (now.isAfter(end)) return 'finished'; // Quá hạn -> Đã kết thúc
      if (now.isAfter(start) && now.isBefore(end)) return 'in_progress'; // Trong khung giờ -> Đang diễn ra
      return 'scheduled'; // Chưa tới giờ -> Đã lên lịch
    }

    return period.status;
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      enqueueSnackbar('Đã xoá kỳ thi', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
    setDeleteId(null);
  };

  return (
    <>
      <PageHeader
        title="Quản lý kỳ thi"
        subtitle="Tạo và quản lý các đợt thi tập trung"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/periods/create')}>
            Tạo kỳ thi
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select size="small" label="Loại thi" value={examType}
          onChange={(e) => { setExamType(e.target.value); setPage(1); }}
          sx={{ minWidth: 200 }}>
          {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          sx={{ minWidth: 180 }}>
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>
          ))}
        </Paper>
      ) : !data?.items.length ? (
        <EmptyState
          message="Chưa có kỳ thi nào"
          action={<Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => navigate('/admin/periods/create')}>Tạo kỳ thi đầu tiên</Button>}
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên kỳ thi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Từ ngày</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Đến ngày</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Phòng ban</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((p) => {
                  const dynamicStatus = getDynamicStatus(p);

                  // Kiểm tra xem thời gian hiện tại có trước lúc bắt đầu không
                  const isBeforeStart = dayjs().isBefore(dayjs(p.start_date));

                  return (
                    <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell><Typography variant="body2" fontWeight={500}>{p.name}</Typography></TableCell>
                      <TableCell>{examTypeLabels[p.exam_type]}</TableCell>
                      <TableCell>{dayjs(p.start_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                      <TableCell>{dayjs(p.end_date).format('DD/MM/YYYY HH:mm')}</TableCell>
                      <TableCell align="center">{p.department_ids.length || 'Tất cả'}</TableCell>

                      {/* Cột 6: Trạng thái */}
                      <TableCell align="center">
                        <Chip size="small" label={examPeriodStatusLabels[dynamicStatus]} color={statusColor[dynamicStatus]} />
                        {p.status === 'cancelled' && p.reject_reason && (
                          <Typography variant="caption" display="block" color="error" sx={{ mt: 0.5 }}>
                            Lý do: {p.reject_reason}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Cột 7: Thao tác */}
                      <TableCell align="center">
                        <Tooltip title="Phòng thi">
                          <IconButton size="small" onClick={() => navigate(`/admin/rooms?period_id=${p.id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Sửa">
                          <IconButton size="small" onClick={() => navigate(`/admin/periods/${p.id}/edit`)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Ràng buộc Xóa: Disabled nếu đang diễn ra */}
                        <Tooltip title={dynamicStatus === 'in_progress' ? "Không thể xóa kỳ thi đang diễn ra" : "Xoá"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={dynamicStatus === 'in_progress'}
                              onClick={() => setDeleteId(p.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        {/* Nút Duyệt / Từ chối (Chỉ hiện khi đang Nháp VÀ chưa tới giờ bắt đầu) */}
                        {p.status === 'draft' && isBeforeStart && (
                          <>
                            <Tooltip title="Duyệt">
                              <IconButton size="small" color="success" onClick={() => setReviewModal({ open: true, id: p.id, type: 'approve' })}>
                                <CheckCircleOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Từ chối">
                              <IconButton size="small" color="warning" onClick={() => setReviewModal({ open: true, id: p.id, type: 'reject' })}>
                                <CancelOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {/* (Tùy chọn) Nếu đang là Nháp nhưng quá hạn, hiện icon mờ báo hiệu */}
                        {p.status === 'draft' && !isBeforeStart && (
                          <Tooltip title="Đã quá hạn thời gian bắt đầu, không thể duyệt/từ chối">
                            <span>
                              <IconButton size="small" disabled>
                                <CheckCircleOutline fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá kỳ thi"
        message="Bạn có chắc chắn muốn xoá kỳ thi này? Không thể xoá nếu còn phòng thi bên trong."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
      <Dialog open={reviewModal.open} onClose={() => setReviewModal({ ...reviewModal, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>
          {reviewModal.type === 'approve' ? 'Xác nhận duyệt kỳ thi' : 'Từ chối kỳ thi'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {reviewModal.type === 'approve'
              ? 'Kỳ thi sau khi duyệt sẽ chuyển sang trạng thái "Đã lên lịch" và tự động kích hoạt khi đến thời gian.'
              : 'Vui lòng nhập lý do từ chối (bắt buộc):'}
          </Typography>

          {reviewModal.type === 'reject' && (
            <TextField
              fullWidth multiline rows={3}
              placeholder="Nhập lý do..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewModal({ ...reviewModal, open: false })}>Hủy</Button>
          <Button
            variant="contained"
            color={reviewModal.type === 'approve' ? 'success' : 'error'}
            disabled={reviewModal.type === 'reject' && !rejectReason.trim()}
            onClick={() => {
              if (!reviewModal.id) return;

              // Setup payload
              const payload = reviewModal.type === 'approve'
                ? { status: 'scheduled' as ExamPeriodStatus }
                : { status: 'cancelled' as ExamPeriodStatus, reject_reason: rejectReason };

              // ĐÃ BỎ COMMENT ĐỂ GỌI API THỰC TẾ
              updateStatusMutation.mutate({ id: reviewModal.id, payload });
            }}
          >
            {reviewModal.type === 'approve' ? 'Duyệt' : 'Xác nhận từ chối'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
