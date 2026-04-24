import { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography, Autocomplete,
} from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { examPeriodApi } from '@/api/examPeriodApi';
import { departmentApi } from '@/api/departmentApi';
import { examApi } from '@/api/examApi';
import { certTypeApi } from '@/api/catalogApi';
import {
  useExamRoom, useCreateExamRoom, useUpdateExamRoom,
} from '@/hooks/useExamRooms';
import type { ExamRoomRequest } from '@/api/examRoomApi';
import type { ExamMode } from '@/types/enums';
import { examModeLabels } from '@/utils/vietnameseLabels';

const toLocal = (iso?: string) => (iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : '');
const fromLocal = (v: string) => (v ? dayjs(v).toISOString() : '');

export default function RoomFormPage() {
  const { roomId } = useParams();
  const isEdit = !!roomId;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const initialPeriodId = searchParams.get('period_id') || '';

  const [form, setForm] = useState<ExamRoomRequest>({
    name: '',
    exam_period_id: initialPeriodId,
    exam_ids: [],
    exam_mode: 'online' as ExamMode,
    department_id: '',
    location: '',
    proctor_id: '',
    scheduled_start: '',
    scheduled_end: '',
    capacity: 50,
    candidate_user_ids: [],
    notes: '',
    certificate_type_id: '',
    certificate_passing_score: undefined,
  });

  const { data: room } = useExamRoom(roomId || '');
  const { data: periods } = useQuery({
    queryKey: ['exam-periods', { page_size: 100 }],
    queryFn: () => examPeriodApi.list({ page_size: 100 }),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });
  const { data: exams } = useQuery({
    queryKey: ['exams', form.exam_period_id, 100],
    queryFn: () => examApi.list({ 
      page: 1, 
      page_size: 100, 
      exam_period_id: form.exam_period_id 
    }),
    enabled: !!form.exam_period_id, // Only fetch when a period is selected
  });

  const { data: certTypes = [] } = useQuery({
    queryKey: ['cert-types', 'all'],
    queryFn: () => certTypeApi.list(true),
  });

  const create = useCreateExamRoom();
  const update = useUpdateExamRoom(roomId || '');

  useEffect(() => {
    if (room) {
      setForm({
        name: room.name,
        exam_period_id: room.exam_period_id,
        exam_ids: room.exam_ids,
        exam_mode: room.exam_mode,
        department_id: room.department_id,
        location: room.location || '',
        proctor_id: room.proctor_id || '',
        scheduled_start: toLocal(room.scheduled_start),
        scheduled_end: toLocal(room.scheduled_end),
        capacity: room.capacity,
        candidate_user_ids: room.candidates.map((c) => c.user_id),
        notes: room.notes || '',
        certificate_type_id: room.certificate_type_id || '',
        certificate_passing_score: room.certificate_passing_score ?? undefined,
      });
    }
  }, [room]);

  const handleSubmit = async () => {
    const payload: ExamRoomRequest = {
      ...form,
      scheduled_start: fromLocal(form.scheduled_start),
      scheduled_end: fromLocal(form.scheduled_end),
      certificate_type_id: form.certificate_type_id || undefined,
      certificate_passing_score: form.certificate_type_id ? form.certificate_passing_score : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({
          name: payload.name,
          location: payload.location,
          proctor_id: payload.proctor_id,
          scheduled_start: payload.scheduled_start,
          scheduled_end: payload.scheduled_end,
          capacity: payload.capacity,
          notes: payload.notes,
        });
        enqueueSnackbar('Đã cập nhật phòng thi', { variant: 'success' });
        navigate(`/admin/rooms/${roomId}`);
      } else {
        const created = await create.mutateAsync(payload);
        enqueueSnackbar('Đã tạo phòng thi', { variant: 'success' });
        navigate(`/admin/rooms/${created.id}`);
      }
    } catch (e: any) {
      const errorDetail = e.response?.data?.detail || e.message || 'Lỗi hệ thống';
      enqueueSnackbar(errorDetail, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? 'Sửa phòng thi' : 'Tạo phòng thi mới'}
        subtitle="Lên lịch thi, chọn đề, chỉ định phòng ban"
      />

      <Card>
        <CardContent>
          <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
            <TextField
              fullWidth label="Tên phòng thi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Phòng A1 - Ca sáng"
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select fullWidth label="Kỳ thi" value={form.exam_period_id}
                onChange={(e) => {
                  const newPeriodId = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    exam_period_id: newPeriodId,
                    exam_ids: [], // Reset exams when period changes
                  }));
                }}
                disabled={isEdit}
              >
                {periods ? (periods.items.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)) : <MenuItem value="" disabled sx={{ display: 'none' }}></MenuItem>}
              </TextField>
              <Autocomplete
                multiple
                options={exams?.items || []}
                getOptionLabel={(o) => `${o.name} (${o.occupation} - Bậc ${o.skill_level})`}
                value={(exams?.items || []).filter((ex) => form.exam_ids.includes(ex.id))}
                onChange={(_, newValue) => setForm({ ...form, exam_ids: newValue.map((ex) => ex.id) })}
                disabled={isEdit || !form.exam_period_id}
                loading={!exams}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Đề thi"
                    helperText={!form.exam_period_id ? 'Vui lòng chọn Kỳ thi trước' : (exams?.total === 0 ? 'Không có đề thi cho kỳ thi này' : '')} 
                  />
                )}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select fullWidth label="Phòng ban" value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                disabled={isEdit}
              >
                {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth label="Hình thức" value={form.exam_mode}
                onChange={(e) => setForm({ ...form, exam_mode: e.target.value as ExamMode })}
                disabled={isEdit}
              >
                {Object.entries(examModeLabels).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth type="datetime-local" label="Bắt đầu"
                value={form.scheduled_start}
                onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth type="datetime-local" label="Kết thúc"
                value={form.scheduled_end}
                onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth type="number" label="Sức chứa" value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                fullWidth label="Địa điểm (thi offline)" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Stack>

            <TextField
              fullWidth multiline minRows={2} label="Ghi chú" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            {/* Certificate */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select fullWidth label="Chứng chỉ (tuỳ chọn)"
                value={form.certificate_type_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, certificate_type_id: val || '', certificate_passing_score: val ? form.certificate_passing_score : undefined });
                }}
              >
                <MenuItem value="">— Không cấp chứng chỉ —</MenuItem>
                {certTypes.map((ct) => (
                  <MenuItem key={ct.id} value={ct.id}>{ct.name}</MenuItem>
                ))}
              </TextField>
              {form.certificate_type_id && (
                <TextField
                  type="number" label="Điểm đạt chứng chỉ"
                  value={form.certificate_passing_score ?? ''}
                  onChange={(e) => setForm({ ...form, certificate_passing_score: e.target.value ? Number(e.target.value) : undefined })}
                  slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
                  sx={{ minWidth: 200 }}
                  helperText="Điểm tối thiểu để được cấp chứng chỉ"
                />
              )}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Sau khi lưu, bạn có thể thêm thí sinh trong trang chi tiết.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/admin/rooms')}>Hủy</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  !form.name || !form.exam_period_id || form.exam_ids.length === 0 ||
                  !form.department_id || !form.scheduled_start || !form.scheduled_end ||
                  create.isPending || update.isPending
                }
              >
                {isEdit ? 'Cập nhật' : 'Tạo phòng thi'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
