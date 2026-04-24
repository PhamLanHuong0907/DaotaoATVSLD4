import apiClient from './client';

export interface Badge {
  code: string;
  title: string;
  description: string;
  icon: string;
  awarded_at: string;
}

export interface PointEvent {
  reason: string;
  points: number;
  note: string | null;
  created_at: string;
}

export interface UserScore {
  user_id: string;
  employee_id: string;
  full_name: string;
  department_id: string | null;
  total_points: number;
  level: number;
  badges: Badge[];
  history: PointEvent[];
}

export interface LeaderboardItem {
  user_id: string;
  employee_id: string;
  full_name: string;
  department_id: string | null;
  total_points: number;
  level: number;
  badge_count: number;
}

export const gamificationApi = {
  myScore: () =>
    apiClient.get<UserScore>('/gamification/me').then((r) => r.data),

  leaderboard: (params: { department_id?: string; limit?: number } = {}) =>
    apiClient.get<LeaderboardItem[]>('/gamification/leaderboard', { params }).then((r) => r.data),
};
