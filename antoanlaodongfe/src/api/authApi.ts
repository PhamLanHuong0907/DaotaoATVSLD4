import apiClient from './client';
import type { UserRole } from '@/types/enums';

export interface MeResponse {
  id: string;
  username: string;
  full_name: string;
  employee_id: string;
  role: UserRole;
  department_id?: string | null;
  occupation?: string | null;
  skill_level: number;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in: number;
  user: MeResponse;
}

export interface RegisterPayload {
  username: string;
  password: string;
  full_name: string;
  employee_id: string;
  department_id?: string;
  occupation?: string;
  skill_level?: number;
  phone?: string;
  email?: string;
}

export const authApi = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', { username, password });
    return data;
  },
  async register(payload: RegisterPayload): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/register', {
      role: 'worker',
      skill_level: 1,
      ...payload,
    });
    return data;
  },
  async me(): Promise<MeResponse> {
    const { data } = await apiClient.get<MeResponse>('/auth/me');
    return data;
  },
  async changePassword(oldPassword: string, newPassword: string) {
    const { data } = await apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return data;
  },

  async updateProfile(payload: { full_name?: string; phone?: string; email?: string }) {
    const { data } = await apiClient.put<MeResponse>('/auth/me', payload);
    return data;
  },

  async adminResetPassword(userId: string, newPassword: string) {
    const { data } = await apiClient.post(`/auth/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return data;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },
};
