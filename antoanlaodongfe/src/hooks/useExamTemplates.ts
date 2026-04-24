import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examTemplateApi } from '@/api/examTemplateApi';
import type { ExamTemplateRequest, ExamTemplateListFilters } from '@/types/examTemplate';

export function useExamTemplates(filters: ExamTemplateListFilters) {
  return useQuery({
    queryKey: ['exam-templates', filters],
    queryFn: () => examTemplateApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useExamTemplate(id: string) {
  return useQuery({
    queryKey: ['exam-template', id],
    queryFn: () => examTemplateApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamTemplateRequest) => examTemplateApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-templates'] }),
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExamTemplateRequest>) => examTemplateApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-templates'] });
      qc.invalidateQueries({ queryKey: ['exam-template', id] });
    },
  });
}

export function useUpdateTemplateStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: string; reviewed_by: string; review_notes?: string }) =>
      examTemplateApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-templates'] });
      qc.invalidateQueries({ queryKey: ['exam-template', id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examTemplateApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-templates'] }),
  });
}
