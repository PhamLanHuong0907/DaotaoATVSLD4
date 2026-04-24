import apiClient from './client';

export type WebhookEvent =
  | 'exam.submitted'
  | 'exam.passed'
  | 'certificate.issued'
  | 'exam_room.created'
  | 'user.created';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
}

export const webhookApi = {
  list: () => apiClient.get<Webhook[]>('/webhooks').then((r) => r.data),

  create: (data: WebhookCreate) =>
    apiClient.post<Webhook>('/webhooks', data).then((r) => r.data),

  update: (id: string, data: Partial<WebhookCreate & { is_active: boolean }>) =>
    apiClient.put<Webhook>(`/webhooks/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/webhooks/${id}`).then((r) => r.data),

  test: (id: string) =>
    apiClient
      .post<{ ok: boolean; status_code: number | null; error: string | null }>(`/webhooks/${id}/test`)
      .then((r) => r.data),
};
