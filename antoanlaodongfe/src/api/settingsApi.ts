import apiClient from './client';

export interface SystemSettings {
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  logo_url: string | null;
  certificate_validity_months: number;
  certificate_signer_name: string | null;
  certificate_signer_title: string | null;
  default_passing_score: number;
  allow_self_register: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type SystemSettingsUpdate = Partial<Omit<SystemSettings, 'updated_at' | 'updated_by'>>;

export const settingsApi = {
  get: () => apiClient.get<SystemSettings>('/settings').then((r) => r.data),

  update: (data: SystemSettingsUpdate) =>
    apiClient.put<SystemSettings>('/settings', data).then((r) => r.data),

  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient
      .post<SystemSettings>('/settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
