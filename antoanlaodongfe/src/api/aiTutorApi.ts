import apiClient from './client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  last_message: string | null;
  updated_at: string;
}

export const aiTutorApi = {
  listSessions: () =>
    apiClient.get<SessionListItem[]>('/ai-tutor/sessions').then((r) => r.data),

  getSession: (id: string) =>
    apiClient.get<ChatSession>(`/ai-tutor/sessions/${id}`).then((r) => r.data),

  deleteSession: (id: string) =>
    apiClient.delete(`/ai-tutor/sessions/${id}`).then((r) => r.data),

  send: (data: { session_id?: string; message: string }) =>
    apiClient.post<ChatSession>('/ai-tutor/chat', data, { timeout: 60000 }).then((r) => r.data),
};
