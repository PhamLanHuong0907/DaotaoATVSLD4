import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { ExamResponse, ExamDetailResponse, ExamTakeResponse, ExamGenerateRequest, ExamListFilters } from '@/types/exam';
import type { ExamSubmitRequest, SubmissionResponse } from '@/types/submission';

export const examApi = {
  list: (params: ExamListFilters) =>
    apiClient.get<PaginatedResponse<ExamResponse>>('/exams', { params }).then((r) => r.data),

  get: (examId: string) =>
    apiClient.get<ExamDetailResponse>(`/exams/${examId}`).then((r) => r.data),

  take: (examId: string) =>
    apiClient.get<ExamTakeResponse>(`/exams/${examId}/take`).then((r) => r.data),

  submit: (examId: string, data: ExamSubmitRequest) =>
    apiClient.post<SubmissionResponse>(`/exams/${examId}/submit`, data).then((r) => r.data),

  generate: (data: ExamGenerateRequest) =>
    apiClient.post<ExamResponse>('/exams/generate', data).then((r) => r.data),

  update: (examId: string, data: Partial<ExamResponse>) =>
    apiClient.patch<ExamResponse>(`/exams/${examId}`, data).then((r) => r.data),

  delete: (examId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/exams/${examId}`).then((r) => r.data),
};
