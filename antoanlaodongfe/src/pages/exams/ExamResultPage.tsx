import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  ArrowBack,
  History,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import ClassificationChip from '@/components/common/ClassificationChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { useSubmission } from '@/hooks/useSubmissions';
import { formatScore, formatDateTime } from '@/utils/formatters';

export default function ExamResultPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading, error } = useSubmission(submissionId || '');

  if (isLoading) return <LoadingOverlay message="Đang tải kết quả..." />;
  if (error || !submission) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/exams')}>Quay lại</Button>}>
        Không thể tải kết quả bài thi.
      </Alert>
    );
  }

  const scorePercent = (submission.total_score / 10) * 100;

  return (
    <>
      <PageHeader title="Kết quả bài thi" />

      {/* Score Card */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4 }}>
            {/* Score Circle */}
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: `conic-gradient(${
                    scorePercent >= 70 ? '#2e7d32' : scorePercent >= 50 ? '#ed6c02' : '#c62828'
                  } ${scorePercent * 3.6}deg, #e0e0e0 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h3" fontWeight={700} color={
                    scorePercent >= 70 ? 'success.main' : scorePercent >= 50 ? 'warning.main' : 'error.main'
                  }>
                    {formatScore(submission.total_score)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /10 điểm
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Info */}
            <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' }, mb: 2 }}>
                <ClassificationChip classification={submission.classification} size="medium" />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`Đúng: ${submission.total_correct}/${submission.total_questions}`}
                  color="success"
                  variant="outlined"
                />
                {submission.submitted_at && (
                  <Chip
                    label={`Nộp lúc: ${formatDateTime(submission.submitted_at)}`}
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Answers Detail */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Chi tiết câu trả lời
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>Câu</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Kết quả</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Câu trả lời</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submission.answers.map((ans) => (
              <TableRow key={ans.question_id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    Câu {ans.question_order}
                  </Typography>
                </TableCell>
                <TableCell>
                  {ans.is_correct ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Cancel color="error" fontSize="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                    {ans.selected_answer || ans.text_answer || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={ans.points_earned > 0 ? 'success.main' : 'text.secondary'}
                  >
                    +{formatScore(ans.points_earned)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/exams')}>
          Quay lại danh sách
        </Button>
        <Button variant="outlined" startIcon={<History />} onClick={() => navigate('/exams/history')}>
          Xem lịch sử thi
        </Button>
      </Box>
    </>
  );
}
