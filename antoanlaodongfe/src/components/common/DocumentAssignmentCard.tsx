import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Stack, Autocomplete, TextField, Button, Chip,
} from '@mui/material';
import { Save, FolderShared } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import { documentApi } from '@/api/documentApi';
import { departmentApi, type DepartmentResponse } from '@/api/departmentApi';

interface Props {
  documentId: string;
  initialDepartmentIds: string[];
}

export default function DocumentAssignmentCard({ documentId, initialDepartmentIds }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });
  const [selected, setSelected] = useState<DepartmentResponse[]>([]);

  useEffect(() => {
    setSelected(departments.filter((d) => initialDepartmentIds.includes(d.id)));
  }, [departments, initialDepartmentIds]);

  const save = useMutation({
    mutationFn: () =>
      documentApi.update(documentId, {
        assigned_department_ids: selected.map((d) => d.id),
      }),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật phân công tài liệu', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <FolderShared color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            Phân công tài liệu cho phòng ban
          </Typography>
          {selected.length === 0 && (
            <Chip size="small" label="Tất cả phòng ban" color="info" />
          )}
        </Stack>

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

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained" startIcon={<Save />}
            onClick={() => save.mutate()} disabled={save.isPending}
          >
            Lưu phân công
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
