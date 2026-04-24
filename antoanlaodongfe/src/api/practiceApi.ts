import apiClient from './client';
import type { QuestionType, DifficultyLevel, TrainingGroup } from '@/types/enums';

export interface PracticeOption {
  label: string;
  text: string;
}

export interface PracticeQuestion {
  question_id: string;
  content: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  options: PracticeOption[];
}

export interface PracticeSession {
  questions: PracticeQuestion[];
  total: number;
}

export interface CheckResult {
  question_id: string;
  is_correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

export interface CheckRequest {
  question_id: string;
  selected_label?: string;
  selected_bool?: boolean;
  text_answer?: string;
}

export const practiceApi = {
  start: (params: {
    count?: number;
    occupation?: string;
    skill_level?: number;
    training_group?: TrainingGroup;
    difficulty?: DifficultyLevel;
  } = {}) =>
    apiClient.get<PracticeSession>('/practice/start', { params }).then((r) => r.data),

  check: (data: CheckRequest) =>
    apiClient.post<CheckResult>('/practice/check', data).then((r) => r.data),
};
