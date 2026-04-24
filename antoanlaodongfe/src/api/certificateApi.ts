import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { ExamType, ResultClassification } from '@/types/enums';

export interface CertificateResponse {
  id: string;
  code: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  department_id: string | null;
  occupation: string | null;
  skill_level: number | null;
  exam_id: string;
  exam_name: string;
  exam_type: ExamType;
  submission_id: string;
  score: number;
  classification: ResultClassification;
  issued_at: string;
  valid_until: string | null;
  revoked: boolean;
  revoked_reason: string | null;
}

export const certificateApi = {
  myCertificates: () =>
    apiClient.get<CertificateResponse[]>('/certificates/my').then((r) => r.data),

  list: (params: { department_id?: string; page?: number; page_size?: number } = {}) =>
    apiClient
      .get<PaginatedResponse<CertificateResponse>>('/certificates', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CertificateResponse>(`/certificates/${id}`).then((r) => r.data),

  verify: (code: string) =>
    apiClient.get<CertificateResponse>(`/certificates/verify/${code}`).then((r) => r.data),

  revoke: (id: string, reason: string) =>
    apiClient
      .post<CertificateResponse>(`/certificates/${id}/revoke`, { reason })
      .then((r) => r.data),

  download: (id: string) =>
    apiClient
      .get(`/certificates/${id}/download`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  expiringSummary: (withinDays = 60) =>
    apiClient
      .get<{
        expiring_count: number;
        expired_count: number;
        within_days: number;
        items: {
          id: string;
          code: string;
          full_name: string;
          employee_id: string;
          exam_name: string;
          valid_until: string | null;
          days_left: number | null;
        }[];
      }>('/certificates/expiring/summary', { params: { within_days: withinDays } })
      .then((r) => r.data),

  notifyExpiringNow: (withinDays = 30) =>
    apiClient
      .post<{ sent: number }>('/certificates/expiring/notify-now', null, {
        params: { within_days: withinDays },
      })
      .then((r) => r.data),

  createRetrainPeriod: (data: { name?: string; within_days?: number }) =>
    apiClient
      .post<{
        period_id: string;
        name: string;
        affected_certs: number;
        affected_users: number;
        departments: number;
        exam_type: string;
        start_date: string;
        end_date: string;
      }>('/certificates/expiring/create-retrain-period', data)
      .then((r) => r.data),
};
