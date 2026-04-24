import apiClient from './client';
import type { PaginatedResponse, StatusResponse } from '@/types/common';
import type { ExamMode, ExamRoomStatus, ApprovalStatus } from '@/types/enums';

export interface RoomCandidate {
  user_id: string;
  employee_id: string;
  full_name: string;
  attended: boolean;
  submission_id: string | null;
  seat_number: string | null;
  assigned_exam_id?: string | null;
}

export interface ExamRoomResponse {
  id: string;
  name: string;
  exam_period_id: string;
  exam_id?: string;
  exam_ids: string[];
  exam_mode: ExamMode;
  department_id: string;
  location: string | null;
  proctor_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  capacity: number;
  candidates: RoomCandidate[];
  status: ExamRoomStatus;
  notes: string | null;
  certificate_type_id: string | null;
  certificate_passing_score: number | null;
  approval_status: ApprovalStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamRoomRequest {
  name: string;
  exam_period_id: string;
  exam_ids: string[];
  exam_mode: ExamMode;
  department_id: string;
  location?: string;
  proctor_id?: string;
  scheduled_start: string;
  scheduled_end: string;
  capacity?: number;
  candidate_user_ids?: string[];
  notes?: string;
  certificate_type_id?: string;
  certificate_passing_score?: number;
}

export interface ExamRoomUpdateRequest {
  name?: string;
  location?: string;
  proctor_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  capacity?: number;
  status?: ExamRoomStatus; // Deprecated or for sys usage only
  notes?: string;
  certificate_type_id?: string;
  certificate_passing_score?: number;
}

export interface ExamRoomListFilters {
  exam_period_id?: string;
  department_id?: string;
  exam_id?: string;
  status?: ExamRoomStatus;
  exam_mode?: ExamMode;
  search?: string;
  page?: number;
  page_size?: number;
}

export const examRoomApi = {
  list: (params: ExamRoomListFilters = {}) =>
    apiClient
      .get<PaginatedResponse<ExamRoomResponse>>('/exam-rooms', { params })
      .then((r) => r.data),

  mySchedule: (upcomingOnly = true) =>
    apiClient
      .get<ExamRoomResponse[]>('/exam-rooms/my-schedule', {
        params: { upcoming_only: upcomingOnly },
      })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ExamRoomResponse>(`/exam-rooms/${id}`).then((r) => r.data),

  create: (data: ExamRoomRequest) =>
    apiClient.post<ExamRoomResponse>('/exam-rooms', data).then((r) => r.data),

  update: (id: string, data: ExamRoomUpdateRequest) =>
    apiClient.put<ExamRoomResponse>(`/exam-rooms/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/exam-rooms/${id}`).then((r) => r.data),

  addCandidates: (id: string, userIds: string[]) =>
    apiClient
      .post<ExamRoomResponse>(`/exam-rooms/${id}/candidates`, userIds)
      .then((r) => r.data),

  removeCandidate: (id: string, userId: string) =>
    apiClient
      .delete<ExamRoomResponse>(`/exam-rooms/${id}/candidates/${userId}`)
      .then((r) => r.data),

  bulkAddByDepartment: (id: string, departmentId: string, skillLevels?: number[]) =>
    apiClient
      .post<ExamRoomResponse>(`/exam-rooms/${id}/candidates/bulk-by-department`, skillLevels || null, {
        params: { department_id: departmentId },
      })
      .then((r) => r.data),

  /** Get PDF blob for the exam used in this room. */
  printExamPdf: (examId: string, variant?: string) =>
    apiClient
      .get(`/exams/${examId}/print-pdf`, {
        params: variant ? { variant } : {},
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  /** Get a ZIP of N shuffled variant PDFs. */
  printExamVariants: (examId: string, count: number) =>
    apiClient
      .get(`/exams/${examId}/print-variants`, {
        params: { count },
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  markAttendance: (
    roomId: string,
    entries: { user_id: string; attended: boolean; seat_number?: string }[],
  ) =>
    apiClient
      .post<ExamRoomResponse>(`/exam-rooms/${roomId}/attendance`, entries)
      .then((r) => r.data),

  submitOfflineScore: (
    roomId: string,
    data: { user_id: string; total_score: number; note?: string },
  ) =>
    apiClient
      .post(`/exam-rooms/${roomId}/offline-score`, data)
      .then((r) => r.data),
};
