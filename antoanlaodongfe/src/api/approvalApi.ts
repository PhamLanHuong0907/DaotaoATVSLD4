import apiClient from './client';

export type PendingType = 'document' | 'course' | 'exam_template' | 'question' | 'exam_room';

export interface PendingItem {
  id: string;
  type: PendingType;
  title: string;
  created_by: string;
  created_at: string;
  occupation: string | null;
  skill_level: number | null;
}

export interface ApprovalSummary {
  total: number;
  by_type: Record<string, number>;
  items: PendingItem[];
}

export const approvalApi = {
  inbox: (type?: PendingType) =>
    apiClient
      .get<ApprovalSummary>('/approvals/inbox', { params: type ? { type } : {} })
      .then((r) => r.data),

  approve: (type: PendingType, id: string, reviewNotes?: string) =>
    apiClient
      .post(`/approvals/${type}/${id}/approve`, { review_notes: reviewNotes })
      .then((r) => r.data),

  reject: (type: PendingType, id: string, reviewNotes?: string) =>
    apiClient
      .post(`/approvals/${type}/${id}/reject`, { review_notes: reviewNotes })
      .then((r) => r.data),
};
