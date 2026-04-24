import type { ExamType, TrainingGroup, QuestionType, DifficultyLevel, ApprovalStatus } from './enums';

export interface QuestionDistribution {
  topic_tag?: string;
  question_type?: QuestionType;
  difficulty?: DifficultyLevel;
  count: number;
}

export interface ExamTemplateRequest {
  name: string;
  exam_type: ExamType;
  training_group: TrainingGroup;
  occupation: string;
  skill_level: number;
  total_questions: number;
  duration_minutes: number;
  passing_score: number;
  distributions: QuestionDistribution[];
  excellent_threshold: number;
  good_threshold: number;
  average_threshold: number;
  created_by: string;
}

export interface ExamTemplateResponse extends ExamTemplateRequest {
  id: string;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface ExamTemplateListFilters {
  exam_type?: ExamType;
  status?: ApprovalStatus;
  occupation?: string;
  skill_level?: number;
  search?: string;
  page?: number;
  page_size?: number;
}
