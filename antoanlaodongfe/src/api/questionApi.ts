import apiClient from './client';
import type { PaginatedResponse, StatusResponse } from '@/types/common';
import type { QuestionType, DifficultyLevel, ApprovalStatus } from '@/types/enums';

export interface QuestionOption {
  label: string;
  text: string;
  is_correct: boolean;
}

export interface QuestionResponse {
  id: string;
  content: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  options?: QuestionOption[];
  correct_answer_bool?: boolean;
  scenario_description?: string;
  expected_key_points?: string[];
  explanation: string;
  occupation: string;
  skill_level: number;
  training_group: string;
  topic_tags: string[];
  status: ApprovalStatus;
  created_by: string;
  created_at: string;
}

export interface QuestionListFilters {
  question_type?: QuestionType;
  difficulty?: DifficultyLevel;
  occupation?: string;
  skill_level?: number;
  training_group?: string;
  topic_tag?: string;
  status?: ApprovalStatus;
  page?: number;
  page_size?: number;
}

export const questionApi = {
  list: (params: QuestionListFilters) =>
    apiClient.get<PaginatedResponse<QuestionResponse>>('/questions', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<QuestionResponse>(`/questions/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    apiClient.post<QuestionResponse>('/questions', data).then((r) => r.data),

  aiGenerate: (data: Record<string, unknown>) =>
    apiClient.post<QuestionResponse[]>('/questions/ai-generate', data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<QuestionResponse>(`/questions/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, data: { status: string; reviewed_by: string }) =>
    apiClient.patch(`/questions/${id}/status`, data).then((r) => r.data),

  bulkApprove: (data: { question_ids: string[]; reviewed_by: string }) =>
    apiClient.post<StatusResponse>('/questions/bulk-approve', data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/questions/${id}`).then((r) => r.data),

  getTopicTags: () =>
    apiClient.get<string[]>('/questions/topic-tags').then((r) => r.data),

  importXlsx: async (file: File): Promise<{ created: number; skipped: number; errors: string[] }> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post('/questions/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  downloadImportTemplate: () =>
    apiClient.get('/questions/import-template', { responseType: 'blob' }).then((r) => r.data as Blob),
};
