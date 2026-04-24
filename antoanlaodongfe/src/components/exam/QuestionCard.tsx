import { Card, CardContent, Typography, Chip, Box, Divider } from '@mui/material';
import type { ExamTakeQuestion } from '@/types/exam';
import { questionTypeLabels } from '@/utils/vietnameseLabels';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';
import ScenarioQuestion from './ScenarioQuestion';

interface QuestionCardProps {
  question: ExamTakeQuestion;
  totalQuestions: number;
  selectedAnswer: string | null;
  textAnswer: string;
  onSelectAnswer: (answer: string) => void;
  onTextAnswer: (answer: string) => void;
}

export default function QuestionCard({
  question,
  totalQuestions,
  selectedAnswer,
  textAnswer,
  onSelectAnswer,
  onTextAnswer,
}: QuestionCardProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} color="primary">
            Câu {question.order}/{totalQuestions}
          </Typography>
          <Chip
            label={questionTypeLabels[question.question_type]}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>

        <Typography variant="body1" sx={{ mb: 2, fontSize: '1.05rem', lineHeight: 1.6 }}>
          {question.content}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {question.question_type === 'multiple_choice' && (
          <MultipleChoiceQuestion
            options={question.options}
            selectedAnswer={selectedAnswer}
            onAnswer={onSelectAnswer}
          />
        )}

        {question.question_type === 'true_false' && (
          <TrueFalseQuestion
            selectedAnswer={selectedAnswer}
            onAnswer={onSelectAnswer}
          />
        )}

        {question.question_type === 'scenario_based' && (
          <ScenarioQuestion
            textAnswer={textAnswer}
            onAnswer={onTextAnswer}
          />
        )}
      </CardContent>
    </Card>
  );
}
