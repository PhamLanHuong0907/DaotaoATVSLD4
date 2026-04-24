import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  TextField,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccessTime,
  QuizOutlined,
  Search as SearchIcon,
  PlayArrow,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { useExams } from '@/hooks/useExams';
import type { ExamType } from '@/types/enums';
import { examTypeLabels, examModeLabels } from '@/utils/vietnameseLabels';
import { formatDateTime, formatDuration } from '@/utils/formatters';

const examTypeOptions = [
  { value: '', label: 'Tất cả loại thi' },
  ...Object.entries(examTypeLabels).map(([value, label]) => ({ value, label })),
];

export default function ExamListPage() {
  const navigate = useNavigate();
  const [examType, setExamType] = useState<string>('');
  const [occupation, setOccupation] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { data, isLoading } = useExams({
    is_active: true,
    exam_type: (examType || undefined) as ExamType | undefined,
    exam_kind: 'trial' as any, // Only show trial/practice exams
    occupation: occupation || undefined,
    page,
    page_size: pageSize,
  });

  return (
    <>
      <PageHeader
        title="Danh sách bài thi"
        subtitle="Chọn kỳ thi để bắt đầu làm bài"
      />

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          size="small"
          label="Loại thi"
          value={examType}
          onChange={(e) => { setExamType(e.target.value); setPage(1); }}
          sx={{ minWidth: 200 }}
        >
          {examTypeOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Tìm theo nghề"
          value={occupation}
          onChange={(e) => { setOccupation(e.target.value); setPage(1); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 200 }}
        />
      </Stack>

      {/* Exam Cards */}
      {isLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="rectangular" height={40} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : !data?.items.length ? (
        <EmptyState message="Không có bài thi nào khả dụng" />
      ) : (
        <>
          <Grid container spacing={3}>
            {data.items.map((exam) => (
              <Grid key={exam.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={examTypeLabels[exam.exam_type]}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={examModeLabels[exam.exam_mode]}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {exam.name}
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nghề: <strong>{exam.occupation}</strong> — Bậc {exam.skill_level}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <QuizOutlined fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {exam.total_questions} câu hỏi
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatDuration(exam.duration_minutes)}
                        </Typography>
                      </Box>
                      {exam.scheduled_date && (
                        <Typography variant="body2" color="text.secondary">
                          Lịch thi: {formatDateTime(exam.scheduled_date)}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PlayArrow />}
                      onClick={() => navigate(`/exams/${exam.id}/take`)}
                    >
                      Vào thi
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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
    </>
  );
}
