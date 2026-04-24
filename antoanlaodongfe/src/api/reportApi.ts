import apiClient from './client';

export interface DashboardResponse {
  active_courses: number;
  total_documents: number;
  total_questions: number;
  total_users: number;
  active_exams: number;
  total_submissions: number;
  pass_rate: number;
}

export interface TrainingListItem {
  full_name: string;
  employee_id: string;
  occupation: string;
  skill_level: number;
  exam_name: string;
  score: number;
  classification: string;
}

export interface TrainingListResponse {
  department_name: string;
  total: number;
  items: TrainingListItem[];
}

export interface StatisticItem {
  group: string;
  total: number;
  passed: number;
  pass_rate: number;
  avg_score: number;
  excellent: number;
  good: number;
  average: number;
  fail: number;
}

export interface StatisticsResponse {
  group_by: string;
  statistics: StatisticItem[];
}

export interface IndividualReport {
  user: { full_name: string; employee_id: string; occupation: string; skill_level: number; department_id: string };
  exam_history: { exam_name: string; exam_type: string; score: number; classification: string; submitted_at: string }[];
  total_exams: number;
}

export interface DepartmentStat {
  department_id: string;
  department_name: string;
  department_code: string;
  total: number;
  passed: number;
  excellent: number;
  good: number;
  average: number;
  fail: number;
  pass_rate: number;
  average_score: number;
}

export interface DepartmentStatsResponse {
  items: DepartmentStat[];
  total_submissions: number;
}

export interface TrendPoint {
  month: string;
  label: string;
  submissions: number;
  pass_rate: number;
}

export interface ClassificationBreakdown {
  excellent: number;
  good: number;
  average: number;
  fail: number;
}

export interface DepartmentCompliance {
  id: string;
  code: string;
  name: string;
  total: number;
  passed_users: number;
  compliance: number;
}

export interface ActivityEvent {
  type: string;
  user: string;
  action: string;
  time: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  dept: string;
  date: string;
  urgent: boolean;
}

export interface ScoreBucket { range: string; count: number }

export interface ExamRoomStat {
  id: string;
  name: string;
  capacity: number;
  candidates: number;
  passed: number;
}

export interface DepartmentExamStat {
  id: string;
  name: string;
  totalCandidates: number;
  passed: number;
  averageScore: number;
  scoreDistribution: ScoreBucket[];
}

export interface TopCandidate {
  user_id: string;
  name: string;
  employee_id: string;
  score: number;
  classification: string;
}

export interface ExamDashboardItem {
  id: string;
  name: string;
  totalCandidates: number;
  passed: number;
  averageScore: number;
  scoreDistribution: ScoreBucket[];
  rooms: ExamRoomStat[];
  departments: DepartmentExamStat[];
  topCandidates: TopCandidate[];
}

export interface CourseDashboardItem {
  id: string;
  name: string;
  status: string;
  lessonCount: number;
  learners: number;
  completed: number;
  completionRate: number;
}

export interface CourseMonthlyStat {
  month: string;
  completionRate: number;
  requiredCourses: number;
}

export interface DashboardExtendedResponse extends DashboardResponse {
  trend_12_months: TrendPoint[];
  classification_breakdown: ClassificationBreakdown;
  department_compliance: DepartmentCompliance[];
  recent_activity: ActivityEvent[];
  upcoming_events: UpcomingEvent[];
  total_departments: number;
  total_facilities: number;
  total_certificates: number;
  exams_list: ExamDashboardItem[];
  courses_list: CourseDashboardItem[];
  course_monthly_stats: CourseMonthlyStat[];
}

export const reportApi = {
  dashboard: () =>
    apiClient.get<DashboardResponse>('/reports/dashboard').then((r) => r.data),

  dashboardExtended: () =>
    apiClient.get<DashboardExtendedResponse>('/reports/dashboard-extended').then((r) => r.data),

  byDepartment: () =>
    apiClient.get<DepartmentStatsResponse>('/reports/by-department').then((r) => r.data),

  trainingList: (params: { department_id?: string; occupation?: string }) =>
    apiClient.get<TrainingListResponse>('/reports/training-list', { params }).then((r) => r.data),

  examResults: (params: { exam_type?: string; occupation?: string; date_from?: string; date_to?: string }) =>
    apiClient.get('/reports/exam-results', { params }).then((r) => r.data),

  individual: (userId: string) =>
    apiClient.get<IndividualReport>(`/reports/individual/${userId}`).then((r) => r.data),

  statistics: (params: { group_by?: string; department_id?: string }) =>
    apiClient.get<StatisticsResponse>('/reports/statistics', { params }).then((r) => r.data),

  exportExcel: (data: { report_type: string; department_id?: string }) =>
    apiClient.post('/reports/export/excel', data, { responseType: 'blob' }).then((r) => r.data),

  exportPdf: (data: { report_type: string; department_id?: string }) =>
    apiClient.post('/reports/export/pdf', data, { responseType: 'blob' }).then((r) => r.data),
};
