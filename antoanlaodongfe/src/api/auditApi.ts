import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  method: string;
  path: string;
  status_code: number;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  actor_id?: string;
  method?: string;
  path_prefix?: string;
  page?: number;
  page_size?: number;
}

export const auditApi = {
  list: (params: AuditFilters = {}) =>
    apiClient.get<PaginatedResponse<AuditLogItem>>('/audit-logs', { params }).then((r) => r.data),
};
