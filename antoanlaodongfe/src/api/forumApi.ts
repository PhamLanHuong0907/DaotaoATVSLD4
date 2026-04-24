import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';

export interface ForumReply {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  upvote_count: number;
  is_upvoted_by_me: boolean;
  is_answer: boolean;
  created_at: string;
}

export interface ForumTopicListItem {
  id: string;
  title: string;
  tags: string[];
  author_name: string;
  author_role: string;
  reply_count: number;
  view_count: number;
  upvote_count: number;
  is_resolved: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumTopicDetail {
  id: string;
  title: string;
  body: string;
  tags: string[];
  occupation: string | null;
  author_id: string;
  author_name: string;
  author_role: string;
  replies: ForumReply[];
  view_count: number;
  upvote_count: number;
  is_upvoted_by_me: boolean;
  is_resolved: boolean;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopicListFilters {
  tag?: string;
  resolved?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export const forumApi = {
  list: (params: TopicListFilters = {}) =>
    apiClient
      .get<PaginatedResponse<ForumTopicListItem>>('/forum/topics', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ForumTopicDetail>(`/forum/topics/${id}`).then((r) => r.data),

  create: (data: { title: string; body: string; tags?: string[]; occupation?: string }) =>
    apiClient.post<ForumTopicDetail>('/forum/topics', data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/forum/topics/${id}`).then((r) => r.data),

  upvoteTopic: (id: string) =>
    apiClient.post<ForumTopicDetail>(`/forum/topics/${id}/upvote`).then((r) => r.data),

  reply: (id: string, content: string) =>
    apiClient.post<ForumTopicDetail>(`/forum/topics/${id}/replies`, { content }).then((r) => r.data),

  upvoteReply: (topicId: string, replyId: string) =>
    apiClient
      .post<ForumTopicDetail>(`/forum/topics/${topicId}/replies/${replyId}/upvote`)
      .then((r) => r.data),

  markAnswer: (topicId: string, replyId: string) =>
    apiClient
      .post<ForumTopicDetail>(`/forum/topics/${topicId}/replies/${replyId}/mark-answer`)
      .then((r) => r.data),

  lock: (id: string) =>
    apiClient.post<ForumTopicDetail>(`/forum/topics/${id}/lock`).then((r) => r.data),

  pin: (id: string) =>
    apiClient.post<ForumTopicDetail>(`/forum/topics/${id}/pin`).then((r) => r.data),
};
