import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  Alert, Stack, Radio, RadioGroup, FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack, CheckCircle, Cancel, Delete,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { questionApi, type QuestionResponse } from '@/api/questionApi';
import { questionTypeLabels, difficultyLabels, trainingGroupLabels } from '@/utils/vietnameseLabels';
import { useAuth } from '@/contexts/AuthContext';

const difficultyColors: Record<string, 'success' | 'warning' | 'error'> = { easy: 'success', medium: 'warning', hard: 'error' };

export default function QuestionDetailPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: question, isLoading, error } = useQuery<QuestionResponse>({
    queryKey: ['question', questionId],
    queryFn: () => questionApi.get(questionId || ''),
    enabled: !!questionId,
  });

  const statusMutation = useMutation({
    mutationFn: (data: { status: string; reviewed_by: string }) =>
      questionApi.updateStatus(questionId || '', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['question', questionId] });
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => questionApi.delete(questionId || ''),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá câu hỏi', { variant: 'success' });
      navigate('/admin/questions');
    },
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleApprove = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'approved', reviewed_by: user?.id || '' });
      enqueueSnackbar('Đã phê duyệt câu hỏi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'rejected', reviewed_by: user?.id || '' });
      enqueueSnackbar('Đã từ chối câu hỏi', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  if (isLoading) return <LoadingOverlay />;
  if (error || !question) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/admin/questions')}>Quay lại</Button>}>
        Không thể tải thông tin câu hỏi.
      </Alert>
    );
  }

  const canReview = question.status === 'draft' || question.status === 'pending_review';

  return (
    <>
      <PageHeader
        title="Chi tiết câu hỏi"
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/questions')}>
            Quay lại
          </Button>
        }
      />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {canReview && (
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={statusMutation.isPending}>
            Phê duyệt
          </Button>
        )}
        {canReview && (
          <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={handleReject} disabled={statusMutation.isPending}>
            Từ chối
          </Button>
        )}
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setShowDeleteDialog(true)}>
          Xoá
        </Button>
      </Box>

      {/* Meta info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}><StatusChip status={question.status} size="medium" /></Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Loại câu hỏi</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={questionTypeLabels[question.question_type]} size="small" variant="outlined" />
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Mức độ</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={difficultyLabels[question.difficulty]} size="small" color={difficultyColors[question.difficulty]} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Nghề / Bậc</Typography>
              <Typography fontWeight={500}>{question.occupation} — Bậc {question.skill_level}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Nhóm huấn luyện</Typography>
              <Typography fontWeight={500}>{trainingGroupLabels[question.training_group as keyof typeof trainingGroupLabels] || question.training_group}</Typography>
            </Grid>
          </Grid>

          {question.topic_tags?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Chủ đề</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {question.topic_tags.map((tag) => <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />)}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Question content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Nội dung câu hỏi</Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            {question.content}
          </Typography>

          {/* Scenario description */}
          {question.scenario_description && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mô tả tình huống</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200', borderRadius: 2 }}>
                {question.scenario_description}
              </Typography>
            </Box>
          )}

          {/* Multiple choice options */}
          {question.question_type === 'multiple_choice' && question.options && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Đáp án</Typography>
              <RadioGroup>
                {question.options.map((opt) => (
                  <FormControlLabel
                    key={opt.label}
                    value={opt.label}
                    control={<Radio checked={opt.is_correct} color={opt.is_correct ? 'success' : 'default'} />}
                    label={
                      <Typography variant="body2" sx={{ fontWeight: opt.is_correct ? 700 : 400, color: opt.is_correct ? 'success.main' : 'text.primary' }}>
                        {opt.label}. {opt.text} {opt.is_correct && '✓'}
                      </Typography>
                    }
                    sx={{
                      mb: 0.5, mx: 0, px: 1.5, py: 0.5, borderRadius: 1,
                      bgcolor: opt.is_correct ? 'success.50' : 'transparent',
                      border: opt.is_correct ? '1px solid' : '1px solid transparent',
                      borderColor: opt.is_correct ? 'success.200' : 'transparent',
                    }}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}

          {/* True/False answer */}
          {question.question_type === 'true_false' && question.correct_answer_bool !== undefined && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Đáp án đúng</Typography>
              <Chip
                label={question.correct_answer_bool ? 'ĐÚNG' : 'SAI'}
                color={question.correct_answer_bool ? 'success' : 'error'}
                sx={{ fontWeight: 700, fontSize: '0.9rem', px: 2, py: 0.5 }}
              />
            </Box>
          )}

          {/* Expected key points (scenario) */}
          {question.expected_key_points && question.expected_key_points.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Các ý chính cần có</Typography>
              <Stack spacing={0.5}>
                {question.expected_key_points.map((point, i) => (
                  <Typography key={i} variant="body2">
                    <Chip label={i + 1} size="small" sx={{ mr: 1, width: 24, height: 24 }} /> {point}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {/* Explanation */}
          {question.explanation && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Giải thích</Typography>
              <Alert severity="info" icon={false}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{question.explanation}</Typography>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Xoá câu hỏi"
        message="Bạn có chắc chắn muốn xoá câu hỏi này?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => { deleteMutation.mutate(); setShowDeleteDialog(false); }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}
