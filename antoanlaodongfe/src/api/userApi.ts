import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { UserRole } from '@/types/enums';

export interface UserResponse {
  id: string;
  username: string;
  full_name: string;
  employee_id: string;
  role: UserRole;
  department_id: string | null;
  occupation: string | null;
  skill_level: number;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRequest {
  username: string;
  password: string;
  full_name: string;
  employee_id: string;
  role: UserRole;
  department_id?: string;
  occupation?: string;
  skill_level?: number;
  phone?: string;
  email?: string;
}

export interface UserListFilters {
  role?: UserRole;
  department_id?: string;
  occupation?: string;
  skill_level?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const userApi = {
  list: (params: UserListFilters) =>
    apiClient.get<PaginatedResponse<UserResponse>>('/users', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<UserResponse>(`/users/${id}`).then((r) => r.data),

  create: (data: UserRequest) =>
    apiClient.post<UserResponse>('/users', data).then((r) => r.data),

  update: (id: string, data: Partial<UserRequest>) =>
    apiClient.put<UserResponse>(`/users/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/users/${id}`).then((r) => r.data),

  activate: (id: string) =>
    apiClient.post<UserResponse>(`/users/${id}/activate`).then((r) => r.data),

  changeRole: (id: string, role: UserRole) =>
    apiClient
      .patch<UserResponse>(`/users/${id}/role`, null, { params: { role } })
      .then((r) => r.data),

  importXlsx: async (file: File): Promise<{ created: number; skipped: number; errors: string[] }> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post('/users/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  downloadImportTemplate: () =>
    apiClient.get('/users/import-template', { responseType: 'blob' }).then((r) => r.data as Blob),
};
