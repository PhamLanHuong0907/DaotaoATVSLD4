import { useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from '@/api/examApi';
import type { ExamGenerateRequest } from '@/types/exam';

export function useExamGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamGenerateRequest) => examApi.generate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}
