import { useQuery } from '@tanstack/react-query';
import { submissionApi } from '@/api/submissionApi';

export function useSubmission(submissionId: string) {
  return useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => submissionApi.get(submissionId),
    enabled: !!submissionId,
  });
}

export function useUserSubmissions(userId: string, page: number, pageSize: number, kind?: string) {
  return useQuery({
    queryKey: ['user-submissions', userId, page, pageSize, kind],
    queryFn: () => submissionApi.listByUser(userId, { page, page_size: pageSize, exam_kind: kind }),
    enabled: !!userId,
    placeholderData: (prev) => prev,
  });
}

export function useExamSubmissions(examId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['exam-submissions', examId, page, pageSize],
    queryFn: () => submissionApi.listByExam(examId, { page, page_size: pageSize }),
    enabled: !!examId,
    placeholderData: (prev) => prev,
  });
}
