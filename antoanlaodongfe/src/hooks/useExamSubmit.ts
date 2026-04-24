import { useMutation } from '@tanstack/react-query';
import { examApi } from '@/api/examApi';
import type { ExamSubmitRequest } from '@/types/submission';

export function useExamSubmit(examId: string) {
  return useMutation({
    mutationFn: (data: ExamSubmitRequest) => examApi.submit(examId, data),
  });
}
