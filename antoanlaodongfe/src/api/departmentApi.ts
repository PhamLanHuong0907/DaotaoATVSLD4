import apiClient from './client';
import type { StatusResponse } from '@/types/common';

export interface DepartmentResponse {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRequest {
  name: string;
  code: string;
  parent_id?: string | null;
  description?: string;
}

export const departmentApi = {
  list: (parentId?: string) =>
    apiClient.get<DepartmentResponse[]>('/departments', { params: parentId ? { parent_id: parentId } : {} }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<DepartmentResponse>(`/departments/${id}`).then((r) => r.data),

  create: (data: DepartmentRequest) =>
    apiClient.post<DepartmentResponse>('/departments', data).then((r) => r.data),

  update: (id: string, data: Partial<DepartmentRequest>) =>
    apiClient.put<DepartmentResponse>(`/departments/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/departments/${id}`).then((r) => r.data),
};
