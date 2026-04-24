import apiClient from './client';
import type { PaginatedResponse, StatusResponse } from '@/types/common';
import type { ApprovalStatus } from '@/types/enums';

export interface DocumentResponse {
  id: string;
  title: string;
  description: string;
  document_type: string;
  file_name: string;
  file_size?: number;
  occupations: string[];
  skill_levels: number[];
  training_groups: string[];
  assigned_department_ids?: string[];
  status: ApprovalStatus;
  uploaded_by: string;
  page_count?: number;
  total_chars?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentListFilters {
  document_type?: string;
  occupation?: string;
  skill_level?: number;
  training_group?: string;
  status?: ApprovalStatus;
  page?: number;
  page_size?: number;
}

export interface UploadAndGenerateResponse {
  document: { id: string; title: string; file_name: string; page_count: number; total_chars: number; status: string };
  course: { id: string; title: string; lesson_count: number; status: string };
  questions: { total: number; by_type: Record<string, number>; by_difficulty: Record<string, number> };
  message: string;
}

export interface StreamEvent {
  event: string;
  progress: number;
  message: string;
  data?: Record<string, unknown>;
}

async function streamUpload(
  url: string,
  formData: FormData,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const baseURL = import.meta.env.VITE_API_URL ? '' : '';
  const response = await fetch(`${baseURL}${url}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = 'Lỗi hệ thống';
    try { detail = JSON.parse(text).detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(parsed);
        } catch { /* skip malformed */ }
      }
    }
  }
}

export const documentApi = {
  list: (params: DocumentListFilters) =>
    apiClient.get<PaginatedResponse<DocumentResponse>>('/documents', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<DocumentResponse>(`/documents/${id}`).then((r) => r.data),

  upload: (formData: FormData) =>
    apiClient.post<DocumentResponse>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  uploadAndGenerate: (formData: FormData) =>
    apiClient.post<UploadAndGenerateResponse>('/documents/upload-and-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    }).then((r) => r.data),

  update: (id: string, data: Partial<{
    title: string; description: string; assigned_department_ids: string[];
  }>) =>
    apiClient.put<DocumentResponse>(`/documents/${id}`, data).then((r) => r.data),

  myDocuments: () =>
    apiClient.get<DocumentResponse[]>('/documents/my-documents').then((r) => r.data),

  updateStatus: (id: string, data: { status: string; reviewed_by: string; review_notes?: string }) =>
    apiClient.patch(`/documents/${id}/status`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<StatusResponse>(`/documents/${id}`).then((r) => r.data),

  downloadUrl: (id: string) => `/api/v1/documents/${id}/download`,

  previewUrl: (id: string) => `/api/v1/documents/${id}/preview`,

  uploadAndGenerateStream: (formData: FormData, onEvent: (event: StreamEvent) => void) =>
    streamUpload('/api/v1/documents/upload-and-generate-stream', formData, onEvent),

  generateContentStream: async (docId: string, onEvent: (event: StreamEvent) => void) => {
    const response = await fetch(`/api/v1/documents/${docId}/generate-content-stream`, {
      method: 'POST',
    });
    if (!response.ok) {
      const text = await response.text();
      let detail = 'Lỗi hệ thống';
      try { detail = JSON.parse(text).detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(line.slice(6)) as StreamEvent);
          } catch { /* skip malformed */ }
        }
      }
    }
  },
};
