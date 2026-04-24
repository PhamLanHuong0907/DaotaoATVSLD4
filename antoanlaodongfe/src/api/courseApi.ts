import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { ApprovalStatus, TrainingGroup } from '@/types/enums';

export interface LessonResponse {
  order: number;
  title: string;
  theory?: string;
  scenario?: string;
  safety_notes?: string;
  duration_minutes: number;
  image_url?: string | null;
  video_url?: string | null;
}

export interface GenerateImagesResponse {
  course_id: string;
  course_title: string;
  total: number;
  generated: number;
  results: {
    lesson_order: number;
    lesson_title: string;
    image_url: string;
  }[];
}

export interface GenerateLessonImageResponse {
  lesson_order: number;
  lesson_title: string;
  image_url: string;
}

export interface ImageGenConfig {
  model: string;
  size: string;
  quality: string;
}

export interface VideoGenConfig {
  model_name: string;
  duration: string;
  mode: string;
  aspect_ratio: string;
  sound: boolean;
  num_segments: number;
}

export interface GenerateVideosResponse {
  course_id: string;
  course_title: string;
  total: number;
  generated: number;
  results: {
    lesson_order: number;
    lesson_title: string;
    video_url: string;
  }[];
}

export interface GenerateLessonVideoResponse {
  lesson_order: number;
  lesson_title: string;
  video_url: string;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  occupation: string;
  skill_level: number;
  training_group: TrainingGroup;
  /** Full lessons array — only present when fetching a single course via GET /courses/{id} */
  lessons?: LessonResponse[];
  /** Convenient lesson count — present in list endpoints */
  lesson_count?: number;
  status: ApprovalStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_department_ids?: string[];
  is_mandatory?: boolean;
  source_document_ids?: string[];
  ai_generated?: boolean;
  ai_model?: string | null;
  ai_generated_at?: string | null;
}

export interface CourseListFilters {
  occupation?: string;
  skill_level?: number;
  training_group?: TrainingGroup;
  status?: ApprovalStatus;
  page?: number;
  page_size?: number;
}

export interface MyCourseItem {
  id: string;
  title: string;
  occupation: string;
  skill_level: number;
  training_group: TrainingGroup;
  lesson_count: number;
  ai_generated: boolean;
  status: ApprovalStatus;
  assigned_department_ids: string[];
  is_mandatory: boolean;
  created_at: string;
}

export const courseApi = {
  list: (params: CourseListFilters) =>
    apiClient.get<PaginatedResponse<CourseResponse>>('/courses', { params }).then((r) => r.data),

  myCourses: (onlyMandatory = false) =>
    apiClient
      .get<MyCourseItem[]>('/courses/my-courses', { params: { only_mandatory: onlyMandatory } })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CourseResponse>(`/courses/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    apiClient.post<CourseResponse>('/courses', data).then((r) => r.data),

  aiGenerate: (data: { document_ids: string[]; occupation: string; skill_level: number; training_group: string; created_by: string }) =>
    apiClient.post<CourseResponse>('/courses/ai-generate', data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<CourseResponse>(`/courses/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, data: { status: string; reviewed_by: string; review_notes?: string }) =>
    apiClient.patch(`/courses/${id}/status`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/courses/${id}`).then((r) => r.data),

  generateImages: (courseId: string, config?: ImageGenConfig) =>
    apiClient.post<GenerateImagesResponse>(`/courses/${courseId}/generate-images`, config).then((r) => r.data),

  generateLessonImage: (courseId: string, lessonOrder: number, config?: ImageGenConfig) =>
    apiClient.post<GenerateLessonImageResponse>(`/courses/${courseId}/lessons/${lessonOrder}/generate-image`, config).then((r) => r.data),

  generateVideos: (courseId: string, config?: VideoGenConfig) =>
    apiClient.post<GenerateVideosResponse>(`/courses/${courseId}/generate-videos`, config).then((r) => r.data),

  generateLessonVideo: (courseId: string, lessonOrder: number, config?: VideoGenConfig) =>
    apiClient.post<GenerateLessonVideoResponse>(`/courses/${courseId}/lessons/${lessonOrder}/generate-video`, config).then((r) => r.data),

  uploadLessonImage: (courseId: string, lessonOrder: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ lesson_order: number; lesson_title: string; image_url: string }>(
      `/courses/${courseId}/lessons/${lessonOrder}/upload-image`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then((r) => r.data);
  },

  uploadLessonVideo: (courseId: string, lessonOrder: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ lesson_order: number; lesson_title: string; video_url: string }>(
      `/courses/${courseId}/lessons/${lessonOrder}/upload-video`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 },
    ).then((r) => r.data);
  },

  clearLessonMedia: (courseId: string, lessonOrder: number, kind: 'image' | 'video') =>
    apiClient.delete<{ success: boolean }>(
      `/courses/${courseId}/lessons/${lessonOrder}/media`, { params: { kind } },
    ).then((r) => r.data),
};
/** Video task trang thai tu BE (polling) */
export interface VideoTaskStatus {
  task_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  step?: string;
  current_step: string;
  progress: string[];
  result: unknown | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 300; // 300 * 3s = 15 phut

/**
 * Bat dau task nen va poll status cho den khi xong.
 * Goi onProgress moi khi status thay doi.
 */
async function startAndPoll<T>(
  startUrl: string,
  config: unknown,
  onProgress: (status: VideoTaskStatus) => void,
): Promise<T> {
  // 1. Start task
  const startResp = await apiClient.post<{ task_id: string }>(startUrl, config);
  const taskId = startResp.data.task_id;

  // 2. Poll status
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const statusResp = await apiClient.get<VideoTaskStatus>(`/courses/video-tasks/${taskId}`);
    const status = statusResp.data;
    onProgress(status);

    if (status.status === 'done') {
      return status.result as T;
    }
    if (status.status === 'error') {
      throw new Error(status.error || 'Lỗi sinh video');
    }
  }
  throw new Error('Timeout: video generation quá thời gian cho phép');
}

export const courseVideoTaskApi = {
  generateLessonVideo: (
    courseId: string,
    lessonOrder: number,
    config: VideoGenConfig,
    onProgress: (status: VideoTaskStatus) => void,
  ) => startAndPoll<GenerateLessonVideoResponse>(
    `/courses/${courseId}/lessons/${lessonOrder}/generate-video-start`,
    config,
    onProgress,
  ),

  generateAllVideos: (
    courseId: string,
    config: VideoGenConfig,
    onProgress: (status: VideoTaskStatus) => void,
  ) => startAndPoll<GenerateVideosResponse>(
    `/courses/${courseId}/generate-videos-start`,
    config,
    onProgress,
  ),
};
