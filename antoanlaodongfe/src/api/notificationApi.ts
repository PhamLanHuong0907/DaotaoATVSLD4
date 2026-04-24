import apiClient from './client';

export type NotificationType =
  | 'exam_scheduled'
  | 'exam_result'
  | 'certificate_issued'
  | 'new_course'
  | 'new_document'
  | 'general';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
}

export const notificationApi = {
  list: (params: { unread_only?: boolean; page?: number; page_size?: number } = {}) =>
    apiClient
      .get<NotificationListResponse>('/notifications', { params })
      .then((r) => r.data),

  markRead: (id: string) =>
    apiClient.post<NotificationItem>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/read-all').then((r) => r.data),
};
