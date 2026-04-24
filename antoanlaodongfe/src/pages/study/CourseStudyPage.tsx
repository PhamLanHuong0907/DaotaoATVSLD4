import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Stack, Button, LinearProgress, Chip,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Paper, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle, RadioButtonUnchecked, ArrowBack, ArrowForward, Done, AccessTime,
  PlayCircleOutline, AutoAwesome, Quiz, EmojiEvents,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import { courseApi } from '@/api/courseApi';
import { lessonProgressApi, type LessonProgress } from '@/api/lessonProgressApi';
import { studyApi, type PracticeQuestion } from '@/api/studyApi';

const FINAL_TEST_KEY = 'course-final-test-pass';
function isCourseFinallyComplete(courseId: string): boolean {
  try {
    const m = JSON.parse(localStorage.getItem(FINAL_TEST_KEY) || '{}');
    return Boolean(m[courseId]);
  } catch { return false; }
}
function markCourseFinallyComplete(courseId: string, score: number) {
  try {
    const m = JSON.parse(localStorage.getItem(FINAL_TEST_KEY) || '{}');
    m[courseId] = { passed: true, score, at: new Date().toISOString() };
    localStorage.setItem(FINAL_TEST_KEY, JSON.stringify(m));
  } catch { /* ignore */ }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}p`;
}

export default function CourseStudyPage() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.get(courseId),
    enabled: !!courseId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['lesson-progress', courseId],
    queryFn: () => lessonProgressApi.getProgress(courseId),
    enabled: !!courseId,
  });

  const progressMap = useMemo(
    () => Object.fromEntries(progress.map((p: LessonProgress) => [p.lesson_order, p])),
    [progress],
  );

  const [currentOrder, setCurrentOrder] = useState<number | null>(null);

  // Pick the first not-completed lesson on first load
  useEffect(() => {
    if (!course || currentOrder !== null) return;
    const sorted = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
    const next = sorted.find((l) => progressMap[l.order]?.status !== 'completed');
    setCurrentOrder(next?.order ?? sorted[0]?.order ?? null);
  }, [course, currentOrder, progressMap]);

  // Track time spent on the current lesson and ping backend periodically
  const tickRef = useRef<number>(0);
  useEffect(() => {
    if (currentOrder === null) return;
    tickRef.current = 0;
    const id = window.setInterval(() => {
      tickRef.current += 1;
      // Every 30 seconds, send time delta to BE
      if (tickRef.current % 30 === 0) {
        lessonProgressApi.markViewed(courseId, currentOrder, 30).catch(() => { });
      }
    }, 1000);
    // Mark as viewed on enter
    lessonProgressApi.markViewed(courseId, currentOrder, 0).then(() => {
      qc.invalidateQueries({ queryKey: ['lesson-progress', courseId] });
    }).catch(() => { });

    return () => {
      window.clearInterval(id);
      // Flush remaining seconds
      const remainder = tickRef.current % 30;
      if (remainder > 0) {
        lessonProgressApi.markViewed(courseId, currentOrder, remainder).catch(() => { });
      }
    };
  }, [courseId, currentOrder, qc]);

  const completeMutation = useMutation({
    mutationFn: (order: number) => lessonProgressApi.markComplete(courseId, order),
    onSuccess: () => {
      enqueueSnackbar('Đã đánh dấu hoàn thành bài học', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['lesson-progress', courseId] });
      qc.invalidateQueries({ queryKey: ['my-course-summaries'] });
    },
  });

  const [finalTestOpen, setFinalTestOpen] = useState(false);
  const [finalPassed, setFinalPassed] = useState(() => isCourseFinallyComplete(courseId));

  if (isLoading || !course) {
    return <Typography>Đang tải khoá học...</Typography>;
  }

  const sortedLessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
  const currentLesson = sortedLessons.find((l) => l.order === currentOrder);
  const currentIndex = sortedLessons.findIndex((l) => l.order === currentOrder);

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const totalCount = sortedLessons.length;
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const allLessonsRead = totalCount > 0 && completedCount >= totalCount;


  const goPrev = () => {
    if (currentIndex > 0) setCurrentOrder(sortedLessons[currentIndex - 1].order);
  };
  const goNext = () => {
    if (currentIndex < sortedLessons.length - 1) setCurrentOrder(sortedLessons[currentIndex + 1].order);
  };

  return (
    <>
      <PageHeader
        title={course.title}
        subtitle={`${course.occupation} · Bậc ${course.skill_level}`}
        action={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/study')}>
            Danh sách khoá học
          </Button>
        }
      />

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Tiến độ: {completedCount}/{totalCount} bài
          </Typography>
          <Typography variant="caption" color="text.secondary">{percent}%</Typography>
        </Stack>
        <LinearProgress
          variant="determinate" value={percent}
          color={percent === 100 ? 'success' : 'primary'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {allLessonsRead && (finalPassed ? (
        <Alert severity="success" icon={<EmojiEvents />} sx={{ mb: 3 }}>
          Bạn đã hoàn thành khóa học này qua bài kiểm tra AI.
        </Alert>
      ) : (
        <Alert
          severity="info" icon={<AutoAwesome />}
          sx={{ mb: 3 }}
          action={
            <Button size="small" variant="contained" startIcon={<Quiz />}
              onClick={() => setFinalTestOpen(true)}>
              Làm bài kiểm tra AI
            </Button>
          }
        >
          Bạn đã đọc hết {totalCount} bài học! Làm bài kiểm tra AI (≥ 60%) để hoàn thành khóa học.
        </Alert>
      ))}

      <Grid container spacing={3}>
        {/* Lessons sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Danh sách bài học
              </Typography>
              <List dense>
                {sortedLessons.map((l) => {
                  const p = progressMap[l.order];
                  const done = p?.status === 'completed';
                  const inProg = p?.status === 'in_progress';
                  return (
                    <ListItem key={l.order} disablePadding>
                      <ListItemButton
                        selected={l.order === currentOrder}
                        onClick={() => setCurrentOrder(l.order)}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {done ? (
                            <CheckCircle fontSize="small" color="success" />
                          ) : inProg ? (
                            <PlayCircleOutline fontSize="small" color="warning" />
                          ) : (
                            <RadioButtonUnchecked fontSize="small" color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${l.order}. ${l.title}`}
                          slotProps={{ primary: { variant: 'body2' } }}
                          secondary={p?.time_spent_seconds ? formatDuration(p.time_spent_seconds) : null}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Lesson content */}
        <Grid size={{ xs: 12, md: 8 }}>
          {!currentLesson ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Chọn một bài học để bắt đầu</Typography>
            </Paper>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Bài {currentLesson.order}/{totalCount}
                    </Typography>
                    <Typography variant="h5">{currentLesson.title}</Typography>
                  </Box>
                  {progressMap[currentLesson.order]?.status === 'completed' && (
                    <Chip label="Đã hoàn thành" color="success" icon={<CheckCircle />} />
                  )}
                </Stack>

                {currentLesson.duration_minutes && (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Thời lượng dự kiến: {currentLesson.duration_minutes} phút
                    </Typography>
                  </Stack>
                )}

                <Divider sx={{ mb: 2 }} />

                {currentLesson.image_url && (
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <img src={currentLesson.image_url} alt={currentLesson.title}
                      style={{ maxWidth: '100%', borderRadius: 8 }} />
                  </Box>
                )}

                {currentLesson.video_url && (
                  <Box sx={{ mb: 2 }}>
                    <video controls style={{ width: '100%', borderRadius: 8 }}>
                      <source src={currentLesson.video_url} />
                    </video>
                  </Box>
                )}

                {currentLesson.theory && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Lý thuyết</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {currentLesson.theory}
                    </Typography>
                  </Box>
                )}

                {currentLesson.scenario && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Tình huống minh hoạ</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {currentLesson.scenario}
                    </Typography>
                  </Alert>
                )}

                {currentLesson.safety_notes && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Lưu ý an toàn</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {currentLesson.safety_notes}
                    </Typography>
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Button startIcon={<ArrowBack />} disabled={currentIndex === 0} onClick={goPrev}>
                    Bài trước
                  </Button>
                  <Button
                    variant="contained" color="success" startIcon={<Done />}
                    disabled={progressMap[currentLesson.order]?.status === 'completed' || completeMutation.isPending}
                    onClick={() => completeMutation.mutate(currentLesson.order)}
                  >
                    Đánh dấu hoàn thành
                  </Button>
                  <Button
                    endIcon={<ArrowForward />}
                    disabled={currentIndex === sortedLessons.length - 1}
                    onClick={goNext}
                  >
                    Bài tiếp
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {finalTestOpen && course && (
        <FinalAITestDialog
          courseTitle={course.title}
          occupation={course.occupation}
          skillLevel={course.skill_level}
          onClose={() => setFinalTestOpen(false)}
          onPass={(score) => {
            markCourseFinallyComplete(courseId, score);
            setFinalPassed(true);
            setFinalTestOpen(false);
            enqueueSnackbar('Chúc mừng! Bạn đã hoàn thành khóa học', { variant: 'success' });
            qc.invalidateQueries({ queryKey: ['my-course-summaries'] });
          }}
        />
      )}
    </>
  );
}

interface FinalTestProps {
  courseTitle: string;
  occupation: string;
  skillLevel: number;
  onClose: () => void;
  onPass: (score: number) => void;
}

function FinalAITestDialog({ courseTitle, occupation, skillLevel, onClose, onPass }: FinalTestProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const gen = useMutation({
    mutationFn: () => studyApi.practiceQuestions({
      topic: courseTitle,
      occupation,
      skill_level: skillLevel,
      count: 5,
    }),
    onSuccess: (r: any) => {
      console.log('AI Test Data Received:', r);
      // Logic tìm mảng câu hỏi "vạn năng"
      let rawQs: any[] | null = null;
      if (Array.isArray(r)) {
        rawQs = r;
      } else if (r && Array.isArray(r.questions)) {
        rawQs = r.questions;
      } else if (r?.data && Array.isArray(r.data.questions)) {
        rawQs = r.data.questions;
      } else if (r?.data && Array.isArray(r.data)) {
        rawQs = r.data;
      }

      if (rawQs) {
        // Chuẩn hóa dữ liệu câu hỏi và lựa chọn
        const normalized = rawQs.map((q: any) => {
          const content = q.content || q.question_content || q.text || q.question || q.title || '';
          const type = (q.question_type || q.type || '').toLowerCase();
          const ansText = String(q.answer || q.correct_answer || '').trim().toLowerCase();

          // Tìm mảng lựa chọn gốc
          let rawOpts = q.options || q.choices || q.answers || q.options_list || [];

          // Xử lý đặc biệt cho câu hỏi dạng Đúng/Sai (True/False)
          const isTF = type === 'true_false' || type === 'true-false' || type === 'tf' ||
            content.toLowerCase().includes('đúng hay sai') ||
            content.toLowerCase().includes('true or false');

          if (isTF) {
            // Xác định xem "Đúng" hay "Sai" là đáp án đúng
            let isTrueCorrect = false;
            if (Array.isArray(rawOpts) && rawOpts.length > 0) {
              const correctOpt = rawOpts.find((o: any) => {
                const t = (typeof o === 'string' ? o : (o.text || o.content || o.answer || '')).toLowerCase();
                const isC = typeof o === 'string' ? false : !!(o.is_correct || o.isCorrect || o.correct || o.is_true);
                return (t.includes('đúng') || t.includes('true') || t.includes('chính xác')) && isC;
              });
              isTrueCorrect = !!correctOpt;
              if (!isTrueCorrect && rawOpts.length >= 1) {
                isTrueCorrect = !!(rawOpts[0].is_correct || rawOpts[0].isCorrect || rawOpts[0].correct);
              }
            }
            if (!isTrueCorrect && ansText) {
              isTrueCorrect = ansText.includes('đúng') || ansText.includes('true') || ansText === '1' || q.correct_answer === true || ansText === 'a';
            }
            rawOpts = [
              { label: 'A', text: 'Đúng', is_correct: isTrueCorrect },
              { label: 'B', text: 'Sai', is_correct: !isTrueCorrect }
            ];
          }

          const options = Array.isArray(rawOpts) ? rawOpts.map((o: any, idx: number) => {
            const defaultLabel = String.fromCharCode(65 + idx);
            let label = (typeof o === 'string' ? defaultLabel : (o.label || o.Option || o.key || defaultLabel));
            label = String(label).replace(/[.\s:]+$/, '').trim().toUpperCase();

            let text = (typeof o === 'string' ? o : (o.text || o.content || o.answer || o.value || o.description || ''));
            const prefixRegex = new RegExp(`^${label}[.\\s:]+\\s*`, 'i');
            text = text.replace(prefixRegex, '').trim();
            text = text.replace(/^[A-Z][.\\s:]+\\s*/i, '').trim();

            // Xác định đáp án đúng:
            // 1. Nếu là object và đã có flag is_correct
            let isC = typeof o === 'string' ? false : !!(o.is_correct || o.isCorrect || o.correct || o.is_true);

            // 2. Nếu chưa có flag hoặc là chuỗi, so sánh nhãn với ansText
            if (!isC && ansText) {
              isC = (ansText === label.toLowerCase()) || (ansText === defaultLabel.toLowerCase());
            }

            return { label, text, is_correct: isC };
          }) : [];

          return { ...q, content, options, question_type: type };
        }).filter(q => q.content);

        setQuestions(normalized);
        if (normalized.length === 0) {
          enqueueSnackbar('AI trả về danh sách câu hỏi trống hoặc không đúng định dạng', { variant: 'warning' });
        }
      } else {
        console.error('Không tìm thấy mảng câu hỏi trong response:', r);
        enqueueSnackbar('Dữ liệu bài tập không đúng định dạng (không tìm thấy mảng)', { variant: 'error' });
      }
    },
    onError: (e: Error) => {
      console.error('Lỗi API:', e);
      enqueueSnackbar(`Lỗi kết nối: ${e.message}`, { variant: 'error' });
    },
  });

  useEffect(() => {
    if (courseTitle && occupation) {
      gen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseTitle, occupation]);

  const { correctCount, percent, passed } = useMemo(() => {
    if (!questions || questions.length === 0) return { correctCount: 0, percent: 0, passed: false };
    const count = questions.reduce((s, q, i) => {
      const chosen = answers[i];
      // Chấp nhận cả nhãn viết hoa/viết thường
      const correctOption = q.options?.find((o) => o.is_correct);
      const correctLabel = correctOption?.label;
      return s + (chosen && correctLabel && chosen === correctLabel ? 1 : 0);
    }, 0);
    const p = Math.round((count / questions.length) * 100);
    return { correctCount: count, percent: p, passed: p >= 60 };
  }, [questions, answers]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoAwesome color="primary" />
          Bài kiểm tra AI — {courseTitle}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {(gen.isPending || (gen.status === 'idle' && questions.length === 0)) ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Đang chuẩn bị câu hỏi... {questions.length > 0 ? `(Đã nhận ${questions.length})` : ''}
            </Typography>
          </Stack>
        ) : gen.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Có lỗi xảy ra: {gen.error instanceof Error ? gen.error.message : 'Không xác định'}
          </Alert>
        ) : questions.length === 0 ? (
          <Alert severity="warning">Không có câu hỏi nào được tải. Vui lòng thử lại.</Alert>
        ) : (
          <Stack spacing={3}>
            {submitted && (
              <Alert key="final-test-result" severity={passed ? 'success' : 'warning'}>
                Điểm: <b>{correctCount}/{questions.length}</b> ({percent}%) —{' '}
                {passed ? 'Đạt! Khóa học sẽ được đánh dấu hoàn thành.' : 'Chưa đạt (cần ≥ 60%). Hãy ôn lại và thử lại.'}
              </Alert>
            )}
            {questions.map((q, i) => {
              const correct = q.options?.find((o) => o.is_correct)?.label;
              const chosen = answers[i];
              const qKey = `q-${i}`;
              return (
                <Paper key={qKey} variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary" gutterBottom>
                    Câu hỏi {i + 1}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                    {q.content || (q as any).question_content || (q as any).text || (q as any).question || (q as any).title || <span style={{ color: 'red' }}>(Trường nội dung không xác định: {JSON.stringify(Object.keys(q))})</span>}
                  </Typography>

                  {q.options && q.options.length > 0 ? (
                    <RadioGroup
                      value={chosen ?? ''}
                      onChange={(e) => !submitted && setAnswers({ ...answers, [i]: e.target.value })}
                    >
                      {q.options.map((o, idx) => (
                        <FormControlLabel
                          key={`${qKey}-opt-${o.label || idx}`} value={o.label}
                          control={<Radio />}
                          label={<span>
                            <b>{o.label}.</b> {o.text}
                            {submitted && o.label === correct && (
                              <Chip size="small" color="success" label="Đáp án đúng" sx={{ ml: 1 }} />
                            )}
                            {submitted && o.label === chosen && chosen !== correct && (
                              <Chip size="small" color="error" label="Bạn chọn" sx={{ ml: 1 }} />
                            )}
                          </span>}
                        />
                      ))}
                    </RadioGroup>
                  ) : (
                    <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                      Không có lựa chọn đáp án cho câu hỏi này.
                    </Typography>
                  )}

                  {submitted && q.explanation && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <b>Giải thích:</b> {q.explanation}
                    </Alert>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
        {!submitted && questions.length > 0 && (
          <Button variant="contained"
            disabled={Object.keys(answers).length < questions.length}
            onClick={() => setSubmitted(true)}>
            Nộp bài
          </Button>
        )}
        {submitted && passed && (
          <Button variant="contained" color="success" onClick={() => onPass(percent)}>
            Hoàn thành khóa học
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
