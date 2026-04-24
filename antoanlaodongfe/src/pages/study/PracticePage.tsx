import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Stack, Alert, MenuItem, TextField,
  RadioGroup, FormControlLabel, Radio, Chip, LinearProgress, Paper, Divider,
} from '@mui/material';
import { PlayArrow, Check, Refresh, EmojiObjects } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import { practiceApi, type PracticeQuestion, type CheckResult } from '@/api/practiceApi';
import type { DifficultyLevel } from '@/types/enums';
import { difficultyLabels } from '@/utils/vietnameseLabels';

const difficultyOptions = [
  { value: '', label: 'Bất kỳ' },
  ...Object.entries(difficultyLabels).map(([v, l]) => ({ value: v, label: l })),
];

const countOptions = [5, 10, 15, 20];

interface AnswerState {
  selected_label?: string;
  selected_bool?: boolean;
  text_answer?: string;
}

export default function PracticePage() {
  const { enqueueSnackbar } = useSnackbar();
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<string>('');

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const session = await practiceApi.start({
        count,
        difficulty: (difficulty || undefined) as DifficultyLevel | undefined,
      });
      if (session.questions.length === 0) {
        enqueueSnackbar('Không có câu hỏi phù hợp', { variant: 'warning' });
        return;
      }
      setQuestions(session.questions);
      setCurrentIdx(0);
      setAnswers({});
      setResults({});
      setScore(null);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuestions([]);
    setAnswers({});
    setResults({});
    setScore(null);
  };

  const current = questions[currentIdx];
  const currentAnswer = current ? answers[current.question_id] : undefined;
  const currentResult = current ? results[current.question_id] : undefined;
  const isLast = currentIdx === questions.length - 1;
  const allChecked = questions.length > 0 && questions.every((q) => results[q.question_id]);

  const updateAnswer = (patch: AnswerState) => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.question_id]: { ...prev[current.question_id], ...patch },
    }));
  };

  const checkCurrent = async () => {
    if (!current || !currentAnswer) return;
    try {
      const res = await practiceApi.check({
        question_id: current.question_id,
        ...currentAnswer,
      });
      setResults((prev) => ({ ...prev, [current.question_id]: res }));
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const next = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
  };
  const prev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const finish = () => {
    const correct = Object.values(results).filter((r) => r.is_correct).length;
    setScore({ correct, total: questions.length });
  };

  // ---------- Setup screen ----------
  if (questions.length === 0) {
    return (
      <>
        <PageHeader
          title="Luyện tập"
          subtitle="Tự luyện tập câu hỏi không tính điểm — kết quả không lưu vào hồ sơ thi"
        />
        <Card sx={{ maxWidth: 560, mx: 'auto' }}>
          <CardContent>
            <Stack spacing={2}>
              <Alert severity="info" icon={<EmojiObjects />}>
                Hệ thống sẽ chọn ngẫu nhiên các câu hỏi đã được phê duyệt theo nghề và bậc tay nghề của bạn.
                Sau mỗi câu trả lời, bạn sẽ thấy đáp án đúng và giải thích ngay lập tức.
              </Alert>
              <TextField
                select fullWidth label="Số câu hỏi" value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {countOptions.map((c) => <MenuItem key={c} value={c}>{c} câu</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth label="Độ khó" value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {difficultyOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
              <Button
                variant="contained" size="large" startIcon={<PlayArrow />}
                onClick={start} disabled={loading}
              >
                Bắt đầu luyện tập
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </>
    );
  }

  // ---------- Score screen ----------
  if (score) {
    const percent = Math.round((score.correct / score.total) * 100);
    return (
      <>
        <PageHeader title="Kết quả luyện tập" />
        <Card sx={{ maxWidth: 560, mx: 'auto' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={700} color={percent >= 70 ? 'success.main' : percent >= 50 ? 'warning.main' : 'error.main'}>
              {score.correct}/{score.total}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Tỉ lệ đúng: {percent}%
            </Typography>
            <Box sx={{ my: 3 }}>
              <LinearProgress
                variant="determinate" value={percent}
                color={percent >= 70 ? 'success' : percent >= 50 ? 'warning' : 'error'}
                sx={{ height: 12, borderRadius: 6 }}
              />
            </Box>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button startIcon={<Refresh />} variant="outlined" onClick={reset}>
                Luyện tiếp
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </>
    );
  }

  // ---------- Quiz screen ----------
  return (
    <>
      <PageHeader title="Luyện tập" subtitle={`Câu ${currentIdx + 1}/${questions.length}`} />

      <Box sx={{ mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={((currentIdx + 1) / questions.length) * 100}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      <Card sx={{ maxWidth: 800, mx: 'auto' }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Chip size="small" label={difficultyLabels[current.difficulty]} />
            <Chip size="small" variant="outlined" label={current.question_type} />
          </Stack>
          <Typography variant="h6" sx={{ mb: 2, lineHeight: 1.6 }}>
            {current.content}
          </Typography>

          {/* Multiple choice */}
          {current.question_type === 'multiple_choice' && (
            <RadioGroup
              value={currentAnswer?.selected_label || ''}
              onChange={(e) => updateAnswer({ selected_label: e.target.value })}
            >
              {current.options.map((opt) => {
                const selected = currentAnswer?.selected_label === opt.label;
                let bg = 'transparent';
                if (currentResult) {
                  if (opt.label === currentAnswer?.selected_label) {
                    bg = currentResult.is_correct ? 'success.50' : 'error.50';
                  }
                }
                return (
                  <Paper
                    key={opt.label}
                    variant="outlined"
                    sx={{
                      mb: 1, p: 1.5, bgcolor: bg,
                      borderColor: selected ? 'primary.main' : 'divider',
                    }}
                  >
                    <FormControlLabel
                      value={opt.label}
                      control={<Radio disabled={!!currentResult} />}
                      label={`${opt.label}. ${opt.text}`}
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                );
              })}
            </RadioGroup>
          )}

          {/* True / False */}
          {current.question_type === 'true_false' && (
            <RadioGroup
              row
              value={currentAnswer?.selected_bool === undefined ? '' : String(currentAnswer.selected_bool)}
              onChange={(e) => updateAnswer({ selected_bool: e.target.value === 'true' })}
            >
              <FormControlLabel value="true" disabled={!!currentResult} control={<Radio />} label="Đúng" />
              <FormControlLabel value="false" disabled={!!currentResult} control={<Radio />} label="Sai" />
            </RadioGroup>
          )}

          {/* Scenario */}
          {current.question_type === 'scenario_based' && (
            <TextField
              fullWidth multiline minRows={4} label="Câu trả lời của bạn"
              value={currentAnswer?.text_answer || ''}
              onChange={(e) => updateAnswer({ text_answer: e.target.value })}
              disabled={!!currentResult}
            />
          )}

          {/* Result */}
          {currentResult && (
            <Alert
              severity={currentResult.is_correct ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              <Typography variant="subtitle2">
                {currentResult.is_correct ? '🎉 Chính xác!' : '❌ Chưa đúng'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Đáp án đúng:</strong> {currentResult.correct_answer}
              </Typography>
              {currentResult.explanation && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Giải thích:</strong> {currentResult.explanation}
                </Typography>
              )}
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Button onClick={prev} disabled={currentIdx === 0}>Câu trước</Button>
            {!currentResult ? (
              <Button
                variant="contained" startIcon={<Check />}
                onClick={checkCurrent}
                disabled={
                  !currentAnswer ||
                  (current.question_type === 'multiple_choice' && !currentAnswer.selected_label) ||
                  (current.question_type === 'true_false' && currentAnswer.selected_bool === undefined) ||
                  (current.question_type === 'scenario_based' && !currentAnswer.text_answer)
                }
              >
                Kiểm tra
              </Button>
            ) : isLast ? (
              <Button variant="contained" color="success" onClick={finish} disabled={!allChecked}>
                Xem kết quả
              </Button>
            ) : (
              <Button variant="contained" onClick={next}>Câu tiếp</Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
