import apiClient from './client';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonProgress {
  id: string;
  user_id: string;
  course_id: string;
  lesson_order: number;
  status: LessonStatus;
  time_spent_seconds: number;
  last_position_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  last_viewed_at: string;
}

export interface CourseSummary {
  course_id: string;
  total_lessons: number;
  completed: number;
  in_progress: number;
  percent: number;
  time_spent_seconds: number;
  last_viewed_lesson_order: number | null;
  is_course_complete: boolean;
}

export interface UserCourseProgressItem {
  user_id: string;
  full_name: string;
  employee_id: string;
  completed: number;
  total_lessons: number;
  percent: number;
  time_spent_seconds: number;
  last_viewed_at: string;
}

export const lessonProgressApi = {
  markViewed: (courseId: string, lessonOrder: number, addSeconds = 0, lastPosition?: number) =>
    apiClient.post<LessonProgress>(
      `/learning/courses/${courseId}/lessons/${lessonOrder}/viewed`,
      { add_seconds: addSeconds, last_position_seconds: lastPosition },
    ).then((r) => r.data),

  markComplete: (courseId: string, lessonOrder: number) =>
    apiClient.post<LessonProgress>(
      `/learning/courses/${courseId}/lessons/${lessonOrder}/complete`,
    ).then((r) => r.data),

  getProgress: (courseId: string) =>
    apiClient.get<LessonProgress[]>(`/learning/courses/${courseId}/progress`).then((r) => r.data),

  getCourseSummary: (courseId: string) =>
    apiClient.get<CourseSummary>(`/learning/courses/${courseId}/summary`).then((r) => r.data),

  mySummaries: () =>
    apiClient.get<CourseSummary[]>('/learning/my-summaries').then((r) => r.data),

  adminUsersProgress: (courseId: string) =>
    apiClient.get<UserCourseProgressItem[]>(`/learning/courses/${courseId}/users`).then((r) => r.data),
};
