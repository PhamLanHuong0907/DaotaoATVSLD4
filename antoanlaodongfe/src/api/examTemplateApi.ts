import apiClient from './client';
import type { PaginatedResponse, StatusResponse } from '@/types/common';
import type { ExamTemplateRequest, ExamTemplateResponse, ExamTemplateListFilters } from '@/types/examTemplate';

export const examTemplateApi = {
  list: (params: ExamTemplateListFilters) =>
    apiClient.get<PaginatedResponse<ExamTemplateResponse>>('/exams/templates', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ExamTemplateResponse>(`/exams/templates/${id}`).then((r) => r.data),

  create: (data: ExamTemplateRequest) =>
    apiClient.post<ExamTemplateResponse>('/exams/templates', data).then((r) => r.data),

  update: (id: string, data: Partial<ExamTemplateRequest>) =>
    apiClient.put<ExamTemplateResponse>(`/exams/templates/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, data: { status: string; reviewed_by: string; review_notes?: string }) =>
    apiClient.patch<ExamTemplateResponse>(`/exams/templates/${id}/status`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/exams/templates/${id}`).then((r) => r.data),
};
