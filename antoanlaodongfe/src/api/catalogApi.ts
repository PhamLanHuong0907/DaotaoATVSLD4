import apiClient from './client';

export interface Occupation {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  skill_levels: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OccupationInput {
  code: string;
  name: string;
  description?: string;
  skill_levels?: number[];
  is_active?: boolean;
}

export interface CertificateType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  validity_months: number;
  issuing_authority?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificateTypeInput {
  code: string;
  name: string;
  description?: string;
  validity_months?: number;
  issuing_authority?: string;
  is_active?: boolean;
}

export const occupationApi = {
  list: (onlyActive = true) =>
    apiClient.get<Occupation[]>('/occupations', { params: { only_active: onlyActive } }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<Occupation>(`/occupations/${id}`).then((r) => r.data),
  create: (data: OccupationInput) =>
    apiClient.post<Occupation>('/occupations', data).then((r) => r.data),
  update: (id: string, data: Partial<OccupationInput>) =>
    apiClient.put<Occupation>(`/occupations/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/occupations/${id}`).then((r) => r.data),
};

export const certTypeApi = {
  list: (onlyActive = true) =>
    apiClient.get<CertificateType[]>('/certificate-types', { params: { only_active: onlyActive } }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<CertificateType>(`/certificate-types/${id}`).then((r) => r.data),
  create: (data: CertificateTypeInput) =>
    apiClient.post<CertificateType>('/certificate-types', data).then((r) => r.data),
  update: (id: string, data: Partial<CertificateTypeInput>) =>
    apiClient.put<CertificateType>(`/certificate-types/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/certificate-types/${id}`).then((r) => r.data),
};
