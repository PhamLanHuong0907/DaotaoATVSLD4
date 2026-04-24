import type { ResultClassification } from './enums';

export interface AnswerSubmit {
  question_id: string;
  question_order: number;
  selected_answer?: string | null;
  text_answer?: string | null;
}

export interface ExamSubmitRequest {
  user_id: string;
  answers: AnswerSubmit[];
}

export interface AnswerResult {
  question_id: string;
  question_order: number;
  selected_answer?: string | null;
  text_answer?: string | null;
  is_correct?: boolean | null;
  points_earned: number;
}

export interface SubmissionResponse {
  id: string;
  exam_id: string;
  user_id: string;
  total_score: number;
  total_correct: number;
  total_questions: number;
  classification: ResultClassification | null;
  answers: AnswerResult[];
  submitted_at: string | null;
  graded_at: string | null;
  created_at: string;
}
