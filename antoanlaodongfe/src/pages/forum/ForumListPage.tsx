import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, Pagination,
  Paper, Tooltip,
} from '@mui/material';
import {
  Add, CheckCircle, PushPin, Search,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { forumApi } from '@/api/forumApi';
import RichTextEditor from '@/components/common/RichTextEditor';

const FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'unresolved', label: 'Chưa giải quyết' },
  { value: 'resolved', label: 'Đã giải quyết' },
];

export default function ForumListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['forum-topics', { search, filter, page }],
    queryFn: () =>
      forumApi.list({
        search: search || undefined,
        resolved: filter === 'resolved' ? true : filter === 'unresolved' ? false : undefined,
        page,
        page_size: 20,
      }),
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', tags: '' });

  const createMutation = useMutation({
    mutationFn: () =>
      forumApi.create({
        title: form.title,
        body: form.body,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (topic) => {
      enqueueSnackbar('Đã đăng câu hỏi', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['forum-topics'] });
      setOpenCreate(false);
      setForm({ title: '', body: '', tags: '' });
      navigate(`/forum/${topic.id}`);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  return (
    <>
      <PageHeader
        title="Diễn đàn ATVSLĐ"
        subtitle="Hỏi đáp và chia sẻ kinh nghiệm về an toàn lao động"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
            Đặt câu hỏi
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small" placeholder="Tìm kiếm câu hỏi..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }}
        />
        <TextField
          select size="small" label="Bộ lọc" value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          sx={{ minWidth: 180 }}
        >
          {FILTER_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : !data?.items.length ? (
        <EmptyState message="Chưa có câu hỏi nào — hãy là người đầu tiên đặt câu hỏi!" />
      ) : (
        <Stack spacing={1.5}>
          {data.items.map((t) => (
            <Card key={t.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/forum/${t.id}`)}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Stats column */}
                    <Stack alignItems="center" sx={{ minWidth: 60 }}>
                      <Typography variant="h6" fontWeight={600}>{t.upvote_count}</Typography>
                      <Typography variant="caption" color="text.secondary">vote</Typography>
                      <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>{t.reply_count}</Typography>
                      <Typography variant="caption" color="text.secondary">trả lời</Typography>
                    </Stack>

                    {/* Body */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        {t.is_pinned && (
                          <Tooltip title="Đã ghim">
                            <PushPin fontSize="small" color="warning" />
                          </Tooltip>
                        )}
                        {t.is_resolved && (
                          <Chip size="small" label="Đã giải quyết" color="success" icon={<CheckCircle />} />
                        )}
                      </Stack>
                      <Typography variant="h6" gutterBottom>{t.title}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                        {t.tags.map((tag) => (
                          <Chip key={tag} size="small" label={tag} variant="outlined" />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="caption" color="text.secondary">
                          {t.author_name} · {dayjs(t.updated_at).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Visibility fontSize="inherit" color="action" />
                          <Typography variant="caption" color="text.secondary">{t.view_count}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      {data && data.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={data.total_pages} page={page}
            onChange={(_, p) => setPage(p)} color="primary" shape="rounded"
          />
        </Box>
      )}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogTitle>Đặt câu hỏi mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Tiêu đề câu hỏi" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Nội dung chi tiết
              </Typography>
              <RichTextEditor
                value={form.body}
                onChange={(html) => setForm({ ...form, body: html })}
                placeholder="Mô tả vấn đề càng chi tiết càng tốt: bối cảnh, đã thử gì, đang gặp khó ở đâu..."
                minHeight={220}
              />
            </Box>
            <TextField
              fullWidth label="Tags (phân tách bằng dấu phẩy)" value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ví dụ: hầm-lò, sơ-cứu, bảo-hộ"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={!form.title.trim() || !form.body.trim() || createMutation.isPending}
          >
            Đăng câu hỏi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
