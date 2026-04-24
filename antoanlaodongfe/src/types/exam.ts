import type { ExamType, ExamMode, QuestionType, ExamKind } from './enums';

export interface ExamResponse {
  id: string;
  name: string;
  exam_type: ExamType;
  exam_mode: ExamMode;
  template_id: string;
  occupation: string;
  skill_level: number;
  total_questions: number;
  total_points: number;
  duration_minutes: number;
  passing_score: number;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  exam_period_id: string | null;
  exam_period_name: string | null;
  exam_kind: ExamKind;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface ExamQuestionOption {
  label: string;
  text: string;
}

export interface ExamTakeQuestion {
  question_id: string;
  order: number;
  content: string;
  question_type: QuestionType;
  options: ExamQuestionOption[];
}

export interface ExamTakeResponse {
  id: string;
  name: string;
  duration_minutes: number;
  total_questions: number;
  questions: ExamTakeQuestion[];
}

export interface ExamQuestionDetail {
  question_id: string;
  order: number;
  content: string;
  question_type: QuestionType;
  options: ExamQuestionOption[];
  correct_answer: string;
  points: number;
}

export interface ExamDetailResponse {
  id: string;
  name: string;
  exam_type: ExamType;
  exam_mode: ExamMode;
  template_id: string;
  occupation: string;
  skill_level: number;
  total_questions: number;
  total_points: number;
  duration_minutes: number;
  passing_score: number;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  exam_period_id: string | null;
  exam_period_name: string | null;
  exam_kind: ExamKind;
  is_active: boolean;
  created_by: string;
  created_at: string;
  questions: ExamQuestionDetail[];
}

export interface ExamGenerateRequest {
  template_id: string;
  name: string;
  exam_mode: ExamMode;
  scheduled_date: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  exam_period_id: string | null;
  exam_kind: ExamKind;
  created_by: string;
}

export interface ExamListFilters {
  exam_type?: ExamType;
  exam_kind?: ExamKind;
  exam_period_id?: string;
  occupation?: string;
  skill_level?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}
