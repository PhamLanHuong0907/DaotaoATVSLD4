import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Container,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Badge,
  Alert,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  Send,
  ListAlt,
  Warning,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useExamTake } from '@/hooks/useExams';
import { useExamSubmit } from '@/hooks/useExamSubmit';
import { useCountdown } from '@/hooks/useCountdown';
import { useAuth } from '@/contexts/AuthContext';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNavigator from '@/components/exam/QuestionNavigator';
import CountdownTimer from '@/components/exam/CountdownTimer';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import type { AnswerSubmit } from '@/types/submission';

const STORAGE_KEY_PREFIX = 'exam_progress_';
const ORDER_KEY_PREFIX = 'exam_order_';
const VIOLATION_KEY_PREFIX = 'exam_violations_';
const MAX_VIOLATIONS = 3;

interface SavedAnswer {
  selected_answer?: string | null;
  text_answer?: string | null;
}

/** Fisher-Yates shuffle for an array of indices. */
function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ExamTakePage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const { data: exam, isLoading, error } = useExamTake(examId || '');
  const submitMutation = useExamSubmit(examId || '');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, SavedAnswer>>(new Map());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // ---- Anti-cheat state ----
  const [orderMap, setOrderMap] = useState<number[] | null>(null);
  const [violations, setViolations] = useState(0);
  const [violationToast, setViolationToast] = useState<string | null>(null);
  const violationsRef = useRef(0);

  const { secondsLeft, isExpired, getTimerColor } = useCountdown(exam?.duration_minutes || 0);

  // Load saved progress from localStorage
  useEffect(() => {
    if (!examId) return;
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + examId);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, SavedAnswer>;
        setAnswers(new Map(Object.entries(parsed)));
      } catch { /* ignore corrupt data */ }
    }
    const savedViolations = localStorage.getItem(VIOLATION_KEY_PREFIX + examId);
    if (savedViolations) {
      const v = parseInt(savedViolations, 10);
      if (!isNaN(v)) {
        setViolations(v);
        violationsRef.current = v;
      }
    }
  }, [examId]);

  // Initialize / restore the per-session question order
  useEffect(() => {
    if (!exam || !examId) return;
    const stored = localStorage.getItem(ORDER_KEY_PREFIX + examId);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length === exam.questions.length) {
          setOrderMap(parsed);
          return;
        }
      } catch { /* ignore */ }
    }
    const fresh = shuffleIndices(exam.questions.length);
    setOrderMap(fresh);
    localStorage.setItem(ORDER_KEY_PREFIX + examId, JSON.stringify(fresh));
  }, [exam, examId]);

  // Auto-save to localStorage every 30s
  useEffect(() => {
    if (!examId || hasSubmitted) return;
    const interval = setInterval(() => {
      const obj = Object.fromEntries(answers);
      localStorage.setItem(STORAGE_KEY_PREFIX + examId, JSON.stringify(obj));
    }, 30000);
    return () => clearInterval(interval);
  }, [examId, answers, hasSubmitted]);

  // Handle timer expiry
  useEffect(() => {
    if (isExpired && !hasSubmitted) {
      setShowExpiredDialog(true);
    }
  }, [isExpired, hasSubmitted]);

  // Warn before leaving
  useEffect(() => {
    if (hasSubmitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasSubmitted]);

  const answeredSet = useMemo(() => {
    const set = new Set<number>();
    if (!exam) return set;
    const list = orderMap ? orderMap.map((i) => exam.questions[i]).filter(Boolean) : exam.questions;
    list.forEach((q, i) => {
      const ans = answers.get(q.question_id);
      if (ans?.selected_answer || ans?.text_answer) set.add(i);
    });
    return set;
  }, [answers, exam, orderMap]);

  const handleAnswer = useCallback((questionId: string, field: 'selected_answer' | 'text_answer', value: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(questionId) || {};
      next.set(questionId, { ...existing, [field]: value });
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!exam || !examId) return;
    setShowSubmitDialog(false);
    setShowExpiredDialog(false);
    setHasSubmitted(true);

    const submissionAnswers: AnswerSubmit[] = exam.questions.map((q) => {
      const ans = answers.get(q.question_id);
      return {
        question_id: q.question_id,
        question_order: q.order,
        selected_answer: ans?.selected_answer || null,
        text_answer: ans?.text_answer || null,
      };
    });

    try {
      const result = await submitMutation.mutateAsync({
        user_id: user?.id || '',
        answers: submissionAnswers,
      });
      localStorage.removeItem(STORAGE_KEY_PREFIX + examId);
      localStorage.removeItem(ORDER_KEY_PREFIX + examId);
      localStorage.removeItem(VIOLATION_KEY_PREFIX + examId);
      enqueueSnackbar('Nộp bài thành công!', { variant: 'success' });
      navigate(`/exams/results/${result.id}`, { replace: true });
    } catch (err) {
      setHasSubmitted(false);
      enqueueSnackbar(`Lỗi nộp bài: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  }, [exam, examId, answers, user?.id, submitMutation, enqueueSnackbar, navigate]);

  // ---- Anti-cheat: register one violation, force-submit on threshold ----
  const recordViolation = useCallback((reason: string) => {
    if (hasSubmitted || !examId) return;
    violationsRef.current += 1;
    const v = violationsRef.current;
    setViolations(v);
    localStorage.setItem(VIOLATION_KEY_PREFIX + examId, String(v));
    setViolationToast(`⚠️ ${reason} (lần ${v}/${MAX_VIOLATIONS})`);
    if (v >= MAX_VIOLATIONS) {
      setViolationToast(`Vi phạm quá ${MAX_VIOLATIONS} lần — bài thi sẽ tự nộp`);
      setTimeout(() => handleSubmit(), 1000);
    }
  }, [examId, hasSubmitted, handleSubmit]);

  // Tab-switch / window blur detection
  useEffect(() => {
    if (hasSubmitted || !exam) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('Bạn vừa rời khỏi tab');
      }
    };
    const onBlur = () => recordViolation('Bạn vừa rời khỏi cửa sổ thi');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [exam, hasSubmitted, recordViolation]);

  // Block copy / paste / context menu inside exam screen
  useEffect(() => {
    if (hasSubmitted) return;
    const block = (e: Event) => {
      e.preventDefault();
      recordViolation('Thao tác sao chép / dán bị cấm');
    };
    const blockContext = (e: Event) => e.preventDefault();
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', blockContext);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', blockContext);
    };
  }, [hasSubmitted, recordViolation]);

  if (isLoading) return <LoadingOverlay message="Đang tải đề thi..." />;

  if (error || !exam) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Alert severity="error">Không thể tải đề thi. Vui lòng thử lại.</Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/exams')}>
          Quay lại danh sách
        </Button>
      </Container>
    );
  }

  // Apply shuffle order if available
  const shuffledQuestions = orderMap
    ? orderMap.map((origIdx) => exam.questions[origIdx]).filter(Boolean)
    : exam.questions;
  const currentQuestion = shuffledQuestions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.question_id);
  const unansweredCount = exam.total_questions - answeredSet.size;

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: 'background.default',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Top Bar */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flexGrow: 1, color: 'text.primary' }}>
            {exam.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {violations > 0 && (
              <Chip
                size="small" color="error" variant="outlined"
                icon={<Warning />}
                label={`Vi phạm: ${violations}/${MAX_VIOLATIONS}`}
              />
            )}
            <CountdownTimer secondsLeft={secondsLeft} color={getTimerColor()} />
            {isMobile && (
              <IconButton onClick={() => setShowNavigator(true)}>
                <Badge badgeContent={unansweredCount} color="error">
                  <ListAlt />
                </Badge>
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Box sx={{ display: 'flex', maxWidth: 1200, mx: 'auto', p: { xs: 1.5, sm: 3 }, gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <QuestionCard
            question={currentQuestion}
            totalQuestions={exam.total_questions}
            selectedAnswer={currentAnswer?.selected_answer || null}
            textAnswer={currentAnswer?.text_answer || ''}
            onSelectAnswer={(val) => handleAnswer(currentQuestion.question_id, 'selected_answer', val)}
            onTextAnswer={(val) => handleAnswer(currentQuestion.question_id, 'text_answer', val)}
          />

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBefore />}
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              Câu trước
            </Button>

            {currentIndex === exam.questions.length - 1 ? (
              <Button
                variant="contained"
                color="success"
                endIcon={<Send />}
                onClick={() => setShowSubmitDialog(true)}
                disabled={hasSubmitted}
              >
                Nộp bài
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<NavigateNext />}
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                Câu tiếp
              </Button>
            )}
          </Box>

          {/* Mobile submit button (always visible) */}
          {isMobile && currentIndex !== exam.questions.length - 1 && (
            <Button
              variant="outlined"
              color="success"
              fullWidth
              startIcon={<Send />}
              sx={{ mt: 2 }}
              onClick={() => setShowSubmitDialog(true)}
              disabled={hasSubmitted}
            >
              Nộp bài ({answeredSet.size}/{exam.total_questions} câu đã trả lời)
            </Button>
          )}
        </Box>

        {/* Desktop Navigator */}
        {!isMobile && (
          <Box sx={{ width: 260, flexShrink: 0 }}>
            <Box sx={{ position: 'sticky', top: 80 }}>
              <QuestionNavigator
                totalQuestions={exam.total_questions}
                currentIndex={currentIndex}
                answeredSet={answeredSet}
                onNavigate={setCurrentIndex}
              />
              <Button
                variant="contained"
                color="success"
                fullWidth
                startIcon={<Send />}
                sx={{ mt: 2 }}
                onClick={() => setShowSubmitDialog(true)}
                disabled={hasSubmitted}
              >
                Nộp bài
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Mobile Navigator Drawer */}
      <Drawer
        anchor="bottom"
        open={showNavigator}
        onClose={() => setShowNavigator(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 } }}
      >
        <QuestionNavigator
          totalQuestions={exam.total_questions}
          currentIndex={currentIndex}
          answeredSet={answeredSet}
          onNavigate={(i) => { setCurrentIndex(i); setShowNavigator(false); }}
        />
      </Drawer>

      {/* Submit Confirmation */}
      <ConfirmDialog
        open={showSubmitDialog}
        title="Xác nhận nộp bài"
        message={
          unansweredCount > 0
            ? `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài?`
            : `Bạn đã trả lời tất cả ${exam.total_questions} câu. Nộp bài ngay?`
        }
        confirmText="Nộp bài"
        confirmColor="primary"
        onConfirm={handleSubmit}
        onCancel={() => setShowSubmitDialog(false)}
      />

      {/* Timer Expired Dialog */}
      <ConfirmDialog
        open={showExpiredDialog}
        title="Hết thời gian!"
        message="Thời gian làm bài đã hết. Bài thi sẽ được nộp tự động với các câu bạn đã trả lời."
        confirmText="Nộp bài"
        cancelText=""
        confirmColor="warning"
        onConfirm={handleSubmit}
        onCancel={handleSubmit}
      />

      {/* Anti-cheat warning toast */}
      <Snackbar
        open={!!violationToast}
        autoHideDuration={4000}
        onClose={() => setViolationToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setViolationToast(null)}>
          {violationToast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
