import apiClient from './client';
import type { PaginatedResponse, StatusResponse } from '@/types/common';
import type { ExamType, ExamPeriodStatus } from '@/types/enums';

export interface ExamPeriodResponse {
  id: string;
  name: string;
  description: string | null;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  department_ids: string[];
  target_occupations: string[];
  target_skill_levels: number[];
  status: ExamPeriodStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  reject_reason?: string;
}

export interface ExamPeriodRequest {
  name: string;
  description?: string;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  department_ids?: string[];
  target_occupations?: string[];
  target_skill_levels?: number[];
}


export interface ExamPeriodUpdateRequest extends Partial<ExamPeriodRequest> {
  status?: ExamPeriodStatus;
  reject_reason?: string; // Bổ sung dòng này
}

export interface ExamPeriodListFilters {
  exam_type?: ExamType;
  status?: ExamPeriodStatus;
  department_id?: string;
  page?: number;
  page_size?: number;
}

export const examPeriodApi = {
  list: (params: ExamPeriodListFilters = {}) =>
    apiClient
      .get<PaginatedResponse<ExamPeriodResponse>>('/exam-periods', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ExamPeriodResponse>(`/exam-periods/${id}`).then((r) => r.data),

  create: (data: ExamPeriodRequest) =>
    apiClient.post<ExamPeriodResponse>('/exam-periods', data).then((r) => r.data),

  update: (id: string, data: ExamPeriodUpdateRequest) =>
    apiClient.put<ExamPeriodResponse>(`/exam-periods/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/exam-periods/${id}`).then((r) => r.data),
};
