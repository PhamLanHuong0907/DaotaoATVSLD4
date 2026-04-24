import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  CheckCircle,
  Cancel,
  Delete,
  ArrowBack,
  PlaylistAdd,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useExamTemplate, useUpdateTemplateStatus, useDeleteTemplate } from '@/hooks/useExamTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { examTypeLabels, trainingGroupLabels, questionTypeLabels, difficultyLabels } from '@/utils/vietnameseLabels';
import { formatDuration } from '@/utils/formatters';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const { data: template, isLoading, error } = useExamTemplate(templateId || '');
  const statusMutation = useUpdateTemplateStatus(templateId || '');
  const deleteMutation = useDeleteTemplate();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'approved', reviewed_by: user?.id || '' });
      enqueueSnackbar('Đã phê duyệt mẫu đề thi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'rejected', reviewed_by: user?.id || '', review_notes: rejectNotes });
      enqueueSnackbar('Đã từ chối mẫu đề thi', { variant: 'success' });
      setShowRejectDialog(false);
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;
    try {
      await deleteMutation.mutateAsync(templateId);
      enqueueSnackbar('Đã xoá mẫu đề thi', { variant: 'success' });
      navigate('/admin/templates');
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
    setShowDeleteDialog(false);
  };

  if (isLoading) return <LoadingOverlay />;
  if (error || !template) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/admin/templates')}>Quay lại</Button>}>
        Không thể tải mẫu đề thi.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={template.name}
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/templates')}>
            Quay lại
          </Button>
        }
      />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/admin/templates/${templateId}/edit`)}>
          Chỉnh sửa
        </Button>
        {(template.status === 'draft' || template.status === 'pending_review') && (
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={statusMutation.isPending}>
            Phê duyệt
          </Button>
        )}
        {(template.status === 'draft' || template.status === 'pending_review') && (
          <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setShowRejectDialog(true)}>
            Từ chối
          </Button>
        )}
        {template.status === 'approved' && (
          <Button variant="contained" startIcon={<PlaylistAdd />} onClick={() => navigate(`/admin/exams/generate?templateId=${templateId}`)}>
            Tạo đề thi
          </Button>
        )}
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setShowDeleteDialog(true)}>
          Xoá
        </Button>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}><StatusChip status={template.status} size="medium" /></Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Loại thi</Typography>
              <Typography fontWeight={500}>{examTypeLabels[template.exam_type]}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Nhóm huấn luyện</Typography>
              <Typography fontWeight={500}>{trainingGroupLabels[template.training_group]}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Nghề / Bậc thợ</Typography>
              <Typography fontWeight={500}>{template.occupation} — Bậc {template.skill_level}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Tổng số câu</Typography>
              <Typography variant="h6" fontWeight={700}>{template.total_questions}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Thời gian</Typography>
              <Typography variant="h6" fontWeight={700}>{formatDuration(template.duration_minutes)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Điểm đạt</Typography>
              <Typography variant="h6" fontWeight={700}>{template.passing_score}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Ngưỡng xếp loại</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip label={`Giỏi ≥${template.excellent_threshold}`} size="small" color="success" variant="outlined" />
                <Chip label={`Khá ≥${template.good_threshold}`} size="small" color="info" variant="outlined" />
                <Chip label={`TB ≥${template.average_threshold}`} size="small" color="warning" variant="outlined" />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Distributions */}
      {template.distributions.length > 0 && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Phân bổ câu hỏi
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Chủ đề</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Loại câu hỏi</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mức độ</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Số câu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {template.distributions.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.topic_tag || '—'}</TableCell>
                      <TableCell>{d.question_type ? questionTypeLabels[d.question_type] : '—'}</TableCell>
                      <TableCell>{d.difficulty ? difficultyLabels[d.difficulty] : '—'}</TableCell>
                      <TableCell align="center"><strong>{d.count}</strong></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối mẫu đề thi</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3}
            label="Lý do từ chối" placeholder="Nhập lý do từ chối..."
            value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowRejectDialog(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={statusMutation.isPending}>
            Từ chối
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Xoá mẫu đề thi"
        message="Bạn có chắc chắn muốn xoá mẫu đề thi này?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}
