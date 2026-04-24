import { useQuery } from '@tanstack/react-query';
import { examApi } from '@/api/examApi';
import type { ExamListFilters } from '@/types/exam';

export function useExams(filters: ExamListFilters) {
  return useQuery({
    queryKey: ['exams', filters],
    queryFn: () => examApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useExamTake(examId: string) {
  return useQuery({
    queryKey: ['exam-take', examId],
    queryFn: () => examApi.take(examId),
    enabled: !!examId,
    staleTime: Infinity,
    refetchOnMount: false,
  });
}
