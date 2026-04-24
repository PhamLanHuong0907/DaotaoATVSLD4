import { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography,
  Autocomplete, Chip,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { departmentApi } from '@/api/departmentApi';
import {
  useExamPeriod,
  useCreateExamPeriod,
  useUpdateExamPeriod,
} from '@/hooks/useExamPeriods';
import type { ExamPeriodRequest } from '@/api/examPeriodApi';
import type { ExamType, ExamPeriodStatus } from '@/types/enums';
import { examTypeLabels, examPeriodStatusLabels } from '@/utils/vietnameseLabels';

const toLocalDatetime = (iso?: string) =>
  iso ? dayjs(iso).format('YYYY-MM-DDTHH:mm') : '';
const fromLocalDatetime = (local: string) =>
  local ? dayjs(local).toISOString() : '';

export default function PeriodFormPage() {
  const { periodId } = useParams();
  const isEdit = !!periodId;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: period } = useExamPeriod(periodId || '');
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });

  const create = useCreateExamPeriod();
  const update = useUpdateExamPeriod(periodId || '');

  const [form, setForm] = useState<ExamPeriodRequest & { status?: ExamPeriodStatus }>({
    name: '',
    description: '',
    exam_type: 'periodic_atvsld' as ExamType,
    start_date: '',
    end_date: '',
    department_ids: [],
    target_occupations: [],
    target_skill_levels: [],
  });

  useEffect(() => {
    if (period) {
      setForm({
        name: period.name,
        description: period.description || '',
        exam_type: period.exam_type,
        start_date: toLocalDatetime(period.start_date),
        end_date: toLocalDatetime(period.end_date),
        department_ids: period.department_ids,
        target_occupations: period.target_occupations,
        target_skill_levels: period.target_skill_levels,
        status: period.status,
      });
    }
  }, [period]);

  const handleSubmit = async () => {
    // 1. Thêm đoạn Validate thời gian bắt đầu ở đây
    const now = dayjs();
    const startDate = dayjs(form.start_date);
    const endDate = dayjs(form.end_date);

    if (!isEdit && startDate.isBefore(now)) {
      enqueueSnackbar('Thời gian bắt đầu phải nằm sau thời gian hiện tại', { variant: 'error' });
      return;
    }

    if (endDate.isBefore(startDate)) {
      enqueueSnackbar('Thời gian kết thúc phải sau thời gian bắt đầu', { variant: 'error' });
      return;
    }

    const payload: ExamPeriodRequest = {
      ...form,
      start_date: fromLocalDatetime(form.start_date),
      end_date: fromLocalDatetime(form.end_date),
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ ...payload, status: form.status });
        enqueueSnackbar('Đã cập nhật kỳ thi', { variant: 'success' });
      } else {
        await create.mutateAsync(payload);
        enqueueSnackbar('Đã tạo kỳ thi', { variant: 'success' });
      }
      navigate('/admin/periods');
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? 'Sửa kỳ thi' : 'Tạo kỳ thi mới'}
        subtitle="Thiết lập phạm vi và thời gian của kỳ thi"
      />

      <Card>
        <CardContent>
          <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
            <TextField
              fullWidth label="Tên kỳ thi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              fullWidth multiline minRows={2} label="Mô tả" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select fullWidth label="Loại thi" value={form.exam_type}
                onChange={(e) => setForm({ ...form, exam_type: e.target.value as ExamType })}
              >
                {Object.entries(examTypeLabels).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
              {isEdit && (
                <TextField
                  select fullWidth label="Trạng thái" value={form.status || 'draft'}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ExamPeriodStatus })}
                >
                  {Object.entries(examPeriodStatusLabels).map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth type="datetime-local" label="Bắt đầu"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth type="datetime-local" label="Kết thúc"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Autocomplete
              multiple
              options={departments}
              getOptionLabel={(o) => `${o.code} — ${o.name}`}
              value={departments.filter((d) => (form.department_ids || []).includes(d.id))}
              onChange={(_, newValue) => setForm({ ...form, department_ids: newValue.map((d) => d.id) })}
              renderInput={(params) => (
                <TextField {...params} label="Phòng ban áp dụng (để trống = tất cả)" />
              )}
            />

            <Autocomplete
              multiple freeSolo options={[] as string[]}
              value={form.target_occupations || []}
              onChange={(_, v) => setForm({ ...form, target_occupations: v as string[] })}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const { key, ...chipProps } = getItemProps({ index });
                  return <Chip key={key} label={option} {...chipProps} />;
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Nghề áp dụng (nhập rồi Enter)" />
              )}
            />

            <Autocomplete
              multiple
              options={[1, 2, 3, 4, 5, 6, 7]}
              getOptionLabel={(o) => `Bậc ${o}`}
              value={form.target_skill_levels || []}
              onChange={(_, v) => setForm({ ...form, target_skill_levels: v as number[] })}
              renderInput={(params) => <TextField {...params} label="Bậc tay nghề áp dụng (để trống = tất cả)" />}
            />

            <Typography variant="caption" color="text.secondary">
              Kỳ thi là khung chứa nhiều phòng thi. Sau khi tạo, bạn sẽ thêm các phòng thi cụ thể (online/onsite) cho từng phòng ban.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/admin/periods')}>Hủy</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!form.name || !form.start_date || !form.end_date || create.isPending || update.isPending}
              >
                {isEdit ? 'Cập nhật' : 'Tạo kỳ thi'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
