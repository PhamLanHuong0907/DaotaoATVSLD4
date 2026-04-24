import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  Alert, Stack, Radio, RadioGroup, FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack, Visibility, CheckCircle, Cancel,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { examApi } from '@/api/examApi';
import type { ExamDetailResponse, ExamQuestionDetail } from '@/types/exam';
import { examTypeLabels, examModeLabels, questionTypeLabels } from '@/utils/vietnameseLabels';
import { formatDateTime, formatDuration } from '@/utils/formatters';

const qtColors: Record<string, 'primary' | 'secondary' | 'warning'> = {
  multiple_choice: 'primary',
  true_false: 'secondary',
  scenario_based: 'warning',
};

export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const { data: exam, isLoading, error } = useQuery<ExamDetailResponse>({
    queryKey: ['exam-detail', examId],
    queryFn: () => examApi.get(examId || ''),
    enabled: !!examId,
  });

  if (isLoading) return <LoadingOverlay />;
  if (error || !exam) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/admin/exams')}>Quay lại</Button>}>
        Không thể tải thông tin kỳ thi.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={exam.name}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Visibility />} onClick={() => navigate(`/admin/exams/${examId}/submissions`)}>
              Xem bài nộp
            </Button>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/exams')}>
              Quay lại
            </Button>
          </Stack>
        }
      />

      {/* Exam Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Loại thi</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={examTypeLabels[exam.exam_type]} size="small" variant="outlined" />
              </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Hình thức</Typography>
              <Typography fontWeight={500}>{examModeLabels[exam.exam_mode]}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Nghề / Bậc</Typography>
              <Typography fontWeight={500}>{exam.occupation} — Bậc {exam.skill_level}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Thời gian</Typography>
              <Typography fontWeight={500}>{formatDuration(exam.duration_minutes)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Lịch thi</Typography>
              <Typography fontWeight={500}>{formatDateTime(exam.scheduled_date)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={exam.is_active ? 'Đang mở' : 'Đã đóng'}
                  size="small"
                  color={exam.is_active ? 'success' : 'default'}
                />
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Tổng số câu</Typography>
              <Typography variant="h6" fontWeight={700}>{exam.total_questions}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Tổng điểm</Typography>
              <Typography variant="h6" fontWeight={700}>{exam.total_points}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Điểm đạt</Typography>
              <Typography variant="h6" fontWeight={700} color="warning.main">{exam.passing_score}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Danh sách câu hỏi ({exam.questions.length})
      </Typography>

      {exam.questions.length === 0 ? (
        <Alert severity="info">Kỳ thi chưa có câu hỏi nào.</Alert>
      ) : (
        <Stack spacing={2}>
          {exam.questions
            .sort((a, b) => a.order - b.order)
            .map((q) => (
              <QuestionItem key={q.question_id} question={q} />
            ))}
        </Stack>
      )}
    </>
  );
}

function QuestionItem({ question }: { question: ExamQuestionDetail }) {
  const q = question;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`Câu ${q.order}`} size="small" sx={{ fontWeight: 700, minWidth: 64 }} />
            <Chip
              label={questionTypeLabels[q.question_type] || q.question_type}
              size="small"
              color={qtColors[q.question_type] || 'default'}
              variant="outlined"
            />
          </Box>
          <Chip label={`${q.points} điểm`} size="small" variant="outlined" />
        </Box>

        {/* Content */}
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2, fontWeight: 500 }}>
          {q.content}
        </Typography>

        {/* Multiple choice options */}
        {q.question_type === 'multiple_choice' && q.options.length > 0 && (
          <RadioGroup>
            {q.options.map((opt) => {
              const isCorrect = opt.label === q.correct_answer;
              return (
                <FormControlLabel
                  key={opt.label}
                  value={opt.label}
                  control={<Radio checked={isCorrect} color={isCorrect ? 'success' : 'default'} />}
                  label={
                    <Typography variant="body2" sx={{ fontWeight: isCorrect ? 700 : 400, color: isCorrect ? 'success.main' : 'text.primary' }}>
                      {opt.label}. {opt.text} {isCorrect && <CheckCircle sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'text-bottom' }} />}
                    </Typography>
                  }
                  sx={{
                    mb: 0.5, mx: 0, px: 1.5, py: 0.5, borderRadius: 1,
                    bgcolor: isCorrect ? 'success.50' : 'transparent',
                    border: isCorrect ? '1px solid' : '1px solid transparent',
                    borderColor: isCorrect ? 'success.200' : 'transparent',
                  }}
                />
              );
            })}
          </RadioGroup>
        )}

        {/* True/False */}
        {q.question_type === 'true_false' && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Đáp án đúng</Typography>
            <Chip
              label={q.correct_answer === 'true' ? 'ĐÚNG' : 'SAI'}
              color={q.correct_answer === 'true' ? 'success' : 'error'}
              icon={q.correct_answer === 'true' ? <CheckCircle /> : <Cancel />}
              sx={{ fontWeight: 700 }}
            />
          </Box>
        )}

        {/* Scenario-based */}
        {q.question_type === 'scenario_based' && (
          <Alert severity="info" icon={false} sx={{ mt: 1 }}>
            <Typography variant="body2"><strong>Gợi ý đáp án:</strong> {q.correct_answer}</Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
