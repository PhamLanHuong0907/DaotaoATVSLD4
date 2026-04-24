import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, Tooltip, Paper,
} from '@mui/material';
import {
  Add, Delete, Edit, Save, Business, AccountTree, ContentCopy,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { departmentApi, type DepartmentResponse, type DepartmentRequest } from '@/api/departmentApi';

const blank: DepartmentRequest = { name: '', code: '', parent_id: null, description: '' };

export default function DepartmentListPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });

  // Build a parent → children map
  const tree = useMemo(() => {
    const byParent: Record<string, DepartmentResponse[]> = {};
    for (const d of departments) {
      const key = d.parent_id || '__root__';
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(d);
    }
    return byParent;
  }, [departments]);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<DepartmentResponse | null>(null);
  const [form, setForm] = useState<DepartmentRequest>(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => departmentApi.create(form),
    onSuccess: () => {
      enqueueSnackbar('Đã tạo phòng ban', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setOpenForm(false);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => departmentApi.update(editing!.id, form),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật phòng ban', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá phòng ban', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['departments'] });
      setDeleteId(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const openCreate = (parentId?: string) => {
    setEditing(null);
    setForm({ ...blank, parent_id: parentId || null });
    setOpenForm(true);
  };

  const openEdit = (d: DepartmentResponse) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code,
      parent_id: d.parent_id,
      description: d.description || '',
    });
    setOpenForm(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    enqueueSnackbar('Đã sao chép ID phòng ban', { variant: 'success' });
  };

  // Render rows recursively, indenting children
  const renderRows = (parentId: string | '__root__', depth = 0): React.ReactNode[] => {
    const children = tree[parentId === '__root__' ? '__root__' : parentId] || [];
    return children.flatMap((d) => [
      <TableRow key={d.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', pl: depth * 3 }}>
            {depth > 0 && (
              <AccountTree fontSize="small" color="action" sx={{ mr: 1 }} />
            )}
            <Box>
              <Typography variant="body2" fontWeight={500}>{d.name}</Typography>
              <Typography variant="caption" color="text.secondary">{d.code}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          {d.description && (
            <Typography variant="caption" color="text.secondary">{d.description}</Typography>
          )}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {d.id.slice(-8)}…
            </Typography>
            <Tooltip title="Sao chép ID đầy đủ">
              <IconButton size="small" onClick={() => copyId(d.id)}>
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
        <TableCell align="center">
          <Tooltip title="Thêm phòng ban con">
            <IconButton size="small" color="primary" onClick={() => openCreate(d.id)}>
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sửa">
            <IconButton size="small" onClick={() => openEdit(d)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xoá">
            <IconButton size="small" color="error" onClick={() => setDeleteId(d.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>,
      ...renderRows(d.id, depth + 1),
    ]);
  };

  return (
    <>
      <PageHeader
        title="Quản lý phòng ban"
        subtitle="Cây tổ chức phòng ban, đơn vị trong công ty"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => openCreate()}>
            Tạo phòng ban
          </Button>
        }
      />

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : departments.length === 0 ? (
        <EmptyState message="Chưa có phòng ban nào" />
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Tên phòng ban</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mô tả</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renderRows('__root__')}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Business color="primary" />
            <Typography variant="h6">{editing ? 'Sửa phòng ban' : 'Tạo phòng ban'}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Tên phòng ban" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <TextField
              fullWidth label="Mã phòng ban" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              helperText="Mã ngắn để tham chiếu, ví dụ: KT, DLO, PXKT-1"
            />
            <TextField
              select fullWidth label="Phòng ban cấp trên (tuỳ chọn)"
              value={form.parent_id || ''}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}
            >
              <MenuItem value="">— Không có (cấp cao nhất) —</MenuItem>
              {departments
                .filter((d) => !editing || d.id !== editing.id)
                .map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              fullWidth multiline minRows={2} label="Mô tả (tuỳ chọn)"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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
        title="Xoá phòng ban"
        message="Bạn có chắc chắn muốn xoá phòng ban này? Người dùng đang gắn vào sẽ không bị xoá nhưng sẽ mất liên kết phòng ban."
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
