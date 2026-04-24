import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Stack, Autocomplete, TextField,
  FormControlLabel, Switch, Button, Chip,
} from '@mui/material';
import { Save, Group } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import { courseApi } from '@/api/courseApi';
import { departmentApi, type DepartmentResponse } from '@/api/departmentApi';

interface Props {
  courseId: string;
  initialDepartmentIds: string[];
  initialMandatory: boolean;
}

/**
 * Inline editor for assigning a course to departments + marking it mandatory.
 * Uses the existing PUT /courses/{id} endpoint.
 */
export default function CourseAssignmentCard({ courseId, initialDepartmentIds, initialMandatory }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });

  const [selected, setSelected] = useState<DepartmentResponse[]>([]);
  const [mandatory, setMandatory] = useState(initialMandatory);

  useEffect(() => {
    setSelected(departments.filter((d) => initialDepartmentIds.includes(d.id)));
    setMandatory(initialMandatory);
  }, [departments, initialDepartmentIds, initialMandatory]);

  const save = useMutation({
    mutationFn: () =>
      courseApi.update(courseId, {
        assigned_department_ids: selected.map((d) => d.id),
        is_mandatory: mandatory,
      }),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật phân công khoá học', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Group color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            Phân công khoá học cho phòng ban
          </Typography>
          {selected.length === 0 && (
            <Chip size="small" label="Áp dụng cho tất cả phòng ban" color="info" />
          )}
        </Stack>

        <Stack spacing={2}>
          <Autocomplete
            multiple
            options={departments}
            getOptionLabel={(o) => `${o.code} — ${o.name}`}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Phòng ban được giao (để trống = tất cả)" />
            )}
          />

          <FormControlLabel
            control={<Switch checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />}
            label="Khoá học bắt buộc"
          />

          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained" startIcon={<Save />}
              onClick={() => save.mutate()} disabled={save.isPending}
            >
              Lưu phân công
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
