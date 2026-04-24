import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { SubmissionResponse } from '@/types/submission';

export const submissionApi = {
  listByExam: (examId: string, params: { page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<SubmissionResponse>>(`/exams/${examId}/submissions`, { params }).then((r) => r.data),

  get: (submissionId: string) =>
    apiClient.get<SubmissionResponse>(`/exams/submissions/${submissionId}`).then((r) => r.data),

  listByUser: (userId: string, params: { page?: number; page_size?: number; exam_kind?: string }) =>
    apiClient.get<PaginatedResponse<SubmissionResponse>>(`/exams/submissions/user/${userId}`, { params }).then((r) => r.data),
};
