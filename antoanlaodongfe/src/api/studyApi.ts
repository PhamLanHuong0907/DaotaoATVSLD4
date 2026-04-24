import apiClient from './client';

export interface StudyMaterialsResponse {
  courses: { id: string; title: string; description: string; occupation: string; skill_level: number; training_group: string; lesson_count: number; is_mandatory?: boolean }[];
  documents: { id: string; title: string; description: string; document_type: string; file_name: string }[];
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export interface ExplainResponse {
  explanation: string;
}

export interface SuggestReviewResponse {
  analysis: string;
  weak_topics: string[];
  suggestions: { topic: string; reason: string; focus_points: string[] }[];
}

export interface PracticeQuestion {
  content: string;
  question_type: string;
  difficulty: string;
  options?: { label: string; text: string; is_correct: boolean }[];
  explanation: string;
}

export const studyApi = {
  getMaterials: (params: { occupation?: string; skill_level?: number }) =>
    apiClient.get<StudyMaterialsResponse>('/study/materials', { params }).then((r) => r.data),

  chat: (data: { user_id: string; session_id: string | null; message: string; occupation?: string; skill_level?: number }) =>
    apiClient.post<ChatResponse>('/study/chat', data).then((r) => r.data),

  explainWrongAnswers: (submissionId: string) =>
    apiClient.post<ExplainResponse>('/study/explain-wrong-answers', { submission_id: submissionId }).then((r) => r.data),

  suggestReview: (submissionId: string) =>
    apiClient.post<SuggestReviewResponse>('/study/suggest-review', { submission_id: submissionId }).then((r) => r.data),

  practiceQuestions: (data: { topic: string; occupation: string; skill_level: number; count: number }) =>
    apiClient.post<{ questions: PracticeQuestion[] }>('/study/practice-questions', data).then((r) => r.data),

  getSessions: (userId: string) =>
    apiClient.get('/study/sessions', { params: { user_id: userId } }).then((r) => r.data),

  getSession: (sessionId: string) =>
    apiClient.get(`/study/sessions/${sessionId}`).then((r) => r.data),
};
