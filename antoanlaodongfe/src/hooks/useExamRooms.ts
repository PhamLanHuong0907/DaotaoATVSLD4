import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  examRoomApi,
  type ExamRoomRequest,
  type ExamRoomUpdateRequest,
  type ExamRoomListFilters,
} from '@/api/examRoomApi';

export function useExamRooms(filters: ExamRoomListFilters = {}) {
  return useQuery({
    queryKey: ['exam-rooms', filters],
    queryFn: () => examRoomApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useExamRoom(id: string) {
  return useQuery({
    queryKey: ['exam-room', id],
    queryFn: () => examRoomApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExamRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamRoomRequest) => examRoomApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-rooms'] }),
  });
}

export function useUpdateExamRoom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamRoomUpdateRequest) => examRoomApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-rooms'] });
      qc.invalidateQueries({ queryKey: ['exam-room', id] });
    },
  });
}

export function useDeleteExamRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examRoomApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-rooms'] }),
  });
}

export function useAddRoomCandidates(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => examRoomApi.addCandidates(roomId, userIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-room', roomId] }),
  });
}

export function useRemoveRoomCandidate(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => examRoomApi.removeCandidate(roomId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-room', roomId] }),
  });
}

export function useBulkAddByDepartment(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { departmentId: string; skillLevels?: number[] }) =>
      examRoomApi.bulkAddByDepartment(roomId, args.departmentId, args.skillLevels),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-room', roomId] }),
  });
}
