import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Select, OutlinedInput, Stack, Switch,
  TextField, Typography, Tooltip, Paper, FormControl, InputLabel,
  FormControlLabel,
} from '@mui/material';
import {
  Add, Delete, Edit, PlayArrow, Save, Webhook as WebhookIcon, CheckCircle,
  ErrorOutline,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { webhookApi, type Webhook, type WebhookEvent, type WebhookCreate } from '@/api/webhookApi';

const ALL_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'exam.submitted', label: 'Khi nộp bài thi' },
  { value: 'exam.passed', label: 'Khi đạt bài thi' },
  { value: 'certificate.issued', label: 'Khi cấp chứng chỉ' },
  { value: 'exam_room.created', label: 'Khi tạo phòng thi' },
  { value: 'user.created', label: 'Khi tạo người dùng' },
];

const blank: WebhookCreate = { name: '', url: '', events: [], secret: '' };

export default function WebhookListPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState<WebhookCreate & { is_active?: boolean }>(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhookApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => webhookApi.create(form),
    onSuccess: () => {
      enqueueSnackbar('Đã tạo webhook', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setOpenForm(false);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => webhookApi.update(editing!.id, form),
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setOpenForm(false);
      setEditing(null);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookApi.delete(id),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteId(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhookApi.test(id),
    onSuccess: (res) => {
      if (res.ok) {
        enqueueSnackbar(`Test thành công (HTTP ${res.status_code})`, { variant: 'success' });
      } else {
        enqueueSnackbar(`Test thất bại: ${res.error || `HTTP ${res.status_code}`}`, { variant: 'warning' });
      }
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpenForm(true);
  };

  const openEdit = (w: Webhook) => {
    setEditing(w);
    setForm({
      name: w.name, url: w.url, events: w.events,
      secret: w.secret || '', is_active: w.is_active,
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
        title="Webhooks"
        subtitle="Tích hợp với hệ thống ngoài qua HTTP callback"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Tạo webhook
          </Button>
        }
      />

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : data.length === 0 ? (
        <EmptyState message="Chưa có webhook nào — tạo mới để hệ thống bên ngoài nhận sự kiện" />
      ) : (
        <Stack spacing={2}>
          {data.map((w) => (
            <Card key={w.id} variant="outlined" sx={{ opacity: w.is_active ? 1 : 0.6 }}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <WebhookIcon color="primary" />
                      <Typography variant="h6">{w.name}</Typography>
                      {!w.is_active && <Chip size="small" label="Tắt" />}
                    </Stack>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, wordBreak: 'break-all' }}>
                      {w.url}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                      {w.events.map((e) => (
                        <Chip key={e} size="small" label={e} variant="outlined" />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircle fontSize="small" color="success" />
                        <Typography variant="caption">{w.success_count} thành công</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ErrorOutline fontSize="small" color="error" />
                        <Typography variant="caption">{w.failure_count} thất bại</Typography>
                      </Box>
                      {w.last_triggered_at && (
                        <Typography variant="caption" color="text.secondary">
                          Lần cuối: {dayjs(w.last_triggered_at).format('DD/MM/YYYY HH:mm')}
                          {w.last_status_code && ` · HTTP ${w.last_status_code}`}
                        </Typography>
                      )}
                    </Stack>
                    {w.last_error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        Lỗi: {w.last_error}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <Tooltip title="Test ngay">
                      <IconButton onClick={() => testMutation.mutate(w.id)} color="primary">
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sửa">
                      <IconButton onClick={() => openEdit(w)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá">
                      <IconButton color="error" onClick={() => setDeleteId(w.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Sửa' : 'Tạo'} webhook</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Tên" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField
              fullWidth label="URL" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/webhook"
            />
            <FormControl fullWidth>
              <InputLabel>Sự kiện</InputLabel>
              <Select
                multiple
                value={form.events}
                onChange={(e) => setForm({ ...form, events: e.target.value as WebhookEvent[] })}
                input={<OutlinedInput label="Sự kiện" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as WebhookEvent[]).map((s) => (
                      <Chip key={s} size="small" label={s} />
                    ))}
                  </Stack>
                )}
              >
                {ALL_EVENTS.map((e) => (
                  <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth label="Secret (HMAC SHA-256, tuỳ chọn)"
              value={form.secret || ''}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              helperText="Nếu cài, mỗi request sẽ kèm header X-ATVSLD-Signature"
            />
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
            disabled={!form.name || !form.url || form.events.length === 0}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Xoá webhook"
        message="Bạn có chắc chắn muốn xoá?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
