import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  examPeriodApi,
  type ExamPeriodRequest,
  type ExamPeriodUpdateRequest,
  type ExamPeriodListFilters,
} from '@/api/examPeriodApi';

export function useExamPeriods(filters: ExamPeriodListFilters = {}) {
  return useQuery({
    queryKey: ['exam-periods', filters],
    queryFn: () => examPeriodApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useExamPeriod(id: string) {
  return useQuery({
    queryKey: ['exam-period', id],
    queryFn: () => examPeriodApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExamPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamPeriodRequest) => examPeriodApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-periods'] }),
  });
}

export function useUpdateExamPeriod(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamPeriodUpdateRequest) => examPeriodApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-periods'] });
      qc.invalidateQueries({ queryKey: ['exam-period', id] });
    },
  });
}

export function useDeleteExamPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examPeriodApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-periods'] }),
  });
}
