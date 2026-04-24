import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Stack, TextField, Typography, Tooltip,
  Switch, FormControlLabel, Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Delete, Edit, MeetingRoom, Computer, Construction, Save,
  Inventory2,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { facilityApi, type Facility, type FacilityCreate, type FacilityType } from '@/api/facilityApi';

const TYPE_LABEL: Record<FacilityType, string> = {
  room: 'Phòng học / Phòng thi',
  projector: 'Máy chiếu',
  computer: 'Máy tính',
  safety_gear: 'Dụng cụ an toàn',
  other: 'Khác',
};

const TYPE_ICON: Record<FacilityType, React.ReactNode> = {
  room: <MeetingRoom />,
  projector: <Inventory2 />,
  computer: <Computer />,
  safety_gear: <Construction />,
  other: <Inventory2 />,
};

const TYPE_COLOR: Record<FacilityType, 'primary' | 'success' | 'warning' | 'info' | 'default'> = {
  room: 'primary',
  projector: 'info',
  computer: 'success',
  safety_gear: 'warning',
  other: 'default',
};

const blank: FacilityCreate = {
  name: '', code: '', facility_type: 'room', location: '', capacity: undefined, description: '',
};

export default function FacilityListPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [filterType, setFilterType] = useState<FacilityType | ''>('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FacilityCreate & { is_active?: boolean }>(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['facilities', filterType],
    queryFn: () => facilityApi.list({
      facility_type: filterType || undefined,
      only_active: false,
    }),
  });

  const createMutation = useMutation({
    mutationFn: () => facilityApi.create(form),
    onSuccess: () => {
      enqueueSnackbar('Đã tạo cơ sở vật chất', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['facilities'] });
      setOpenForm(false);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => facilityApi.update(editing!.id, form),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['facilities'] });
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => facilityApi.delete(id),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['facilities'] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpenForm(true);
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setForm({
      name: f.name,
      code: f.code,
      facility_type: f.facility_type,
      location: f.location || '',
      capacity: f.capacity || undefined,
      description: f.description || '',
      is_active: f.is_active,
    });
    setOpenForm(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  };

  return (
    <>
      <PageHeader
        title="Cơ sở vật chất"
        subtitle="Quản lý phòng học, máy chiếu, thiết bị phục vụ thi"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Thêm cơ sở vật chất
          </Button>
        }
      />

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          select size="small" label="Loại"
          value={filterType} onChange={(e) => setFilterType(e.target.value as FacilityType | '')}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {Object.entries(TYPE_LABEL).map(([v, l]) => (
            <MenuItem key={v} value={v}>{l}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : data.length === 0 ? (
        <EmptyState message="Chưa có cơ sở vật chất nào" />
      ) : (
        <Grid container spacing={2}>
          {data.map((f) => (
            <Grid key={f.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ opacity: f.is_active ? 1 : 0.6 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: 'primary.main' }}>{TYPE_ICON[f.facility_type]}</Box>
                      <Chip size="small" label={TYPE_LABEL[f.facility_type]} color={TYPE_COLOR[f.facility_type]} />
                    </Box>
                    {!f.is_active && <Chip size="small" label="Ngưng sử dụng" />}
                  </Stack>
                  <Typography variant="h6">{f.name}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Mã: {f.code}
                  </Typography>
                  {f.location && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Vị trí: {f.location}
                    </Typography>
                  )}
                  {f.capacity !== null && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Sức chứa: {f.capacity}
                    </Typography>
                  )}
                  {f.description && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      mt: 1,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {f.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                    <Tooltip title="Sửa">
                      <IconButton size="small" onClick={() => openEdit(f)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(f.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Sửa' : 'Thêm'} cơ sở vật chất</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Tên" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField label="Mã" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                select label="Loại" value={form.facility_type}
                onChange={(e) => setForm({ ...form, facility_type: e.target.value as FacilityType })}
                sx={{ flex: 1 }}
              >
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField fullWidth label="Vị trí" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
            {form.facility_type === 'room' && (
              <TextField fullWidth type="number" label="Sức chứa"
                value={form.capacity || ''}
                onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : undefined })}
              />
            )}
            <TextField fullWidth multiline minRows={2} label="Mô tả" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {editing && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active ?? true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                }
                label="Đang hoạt động"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Hủy</Button>
          <Button
            variant="contained" startIcon={<Save />}
            onClick={handleSubmit}
            disabled={!form.name || !form.code || createMutation.isPending || updateMutation.isPending}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá cơ sở vật chất"
        message="Bạn có chắc chắn muốn xoá?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
