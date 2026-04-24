import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Chip, Stack, Typography, Button, Tabs, Tab, IconButton,
  Tooltip, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  List, ListItem, ListItemText, Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle, Cancel, OpenInNew, Description, School, Assignment, QuestionAnswer, MeetingRoom,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { approvalApi, type PendingType, type PendingItem } from '@/api/approvalApi';

const TYPE_LABEL: Record<PendingType, string> = {
  document: 'Tài liệu',
  course: 'Khoá học',
  exam_template: 'Mẫu đề thi',
  question: 'Câu hỏi',
  exam_room: 'Phòng thi',
};

const TYPE_ICON: Record<PendingType, React.ReactNode> = {
  document: <Description fontSize="small" />,
  course: <School fontSize="small" />,
  exam_template: <Assignment fontSize="small" />,
  question: <QuestionAnswer fontSize="small" />,
  exam_room: <MeetingRoom fontSize="small" />,
};

const TYPE_LINK: Record<PendingType, (id: string) => string> = {
  document: (id) => `/admin/documents/${id}`,
  course: (id) => `/admin/courses/${id}`,
  exam_template: (id) => `/admin/templates/${id}`,
  question: (id) => `/admin/questions/${id}`,
  exam_room: (id) => `/admin/rooms/${id}`,
};

const TABS: Array<{ value: PendingType | ''; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'document', label: 'Tài liệu' },
  { value: 'course', label: 'Khoá học' },
  { value: 'exam_template', label: 'Mẫu đề thi' },
  { value: 'question', label: 'Câu hỏi' },
  { value: 'exam_room', label: 'Phòng thi' },
];

export default function ApprovalInboxPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [tab, setTab] = useState<PendingType | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['approval-inbox', tab],
    queryFn: () => approvalApi.inbox(tab || undefined),
  });

  const [reviewing, setReviewing] = useState<{ item: PendingItem; action: 'approve' | 'reject' } | null>(null);
  const [notes, setNotes] = useState('');

  const reviewMutation = useMutation({
    mutationFn: ({ type, id, action, reviewNotes }: { type: PendingType; id: string; action: 'approve' | 'reject'; reviewNotes?: string }) =>
      action === 'approve'
        ? approvalApi.approve(type, id, reviewNotes)
        : approvalApi.reject(type, id, reviewNotes),
    onSuccess: (_data, vars) => {
      enqueueSnackbar(
        vars.action === 'approve' ? 'Đã phê duyệt' : 'Đã từ chối',
        { variant: 'success' },
      );
      qc.invalidateQueries({ queryKey: ['approval-inbox'] });
      setReviewing(null);
      setNotes('');
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleSubmit = () => {
    if (!reviewing) return;
    reviewMutation.mutate({
      type: reviewing.item.type,
      id: reviewing.item.id,
      action: reviewing.action,
      reviewNotes: notes || undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Duyệt nội dung"
        subtitle="Tài liệu, khoá học, mẫu đề và câu hỏi đang chờ phê duyệt"
      />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(['document', 'course', 'exam_template', 'exam_room', 'question'] as PendingType[]).map((t) => (
          <Grid key={t} size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  {TYPE_ICON[t]}
                  <Typography variant="caption" color="text.secondary">{TYPE_LABEL[t]}</Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                  {data?.by_type?.[t] ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab key={t.value || 'all'} value={t.value} label={t.label} />
        ))}
      </Tabs>

      {isLoading ? (
        <Paper sx={{ p: 3 }}><Typography>Đang tải...</Typography></Paper>
      ) : !data?.items.length ? (
        <EmptyState
          message="Hộp duyệt trống — không có gì cần xử lý"
        />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {data.items.map((item, i) => (
              <Box key={`${item.type}-${item.id}`}>
                {i > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Mở chi tiết">
                        <IconButton size="small" onClick={() => navigate(TYPE_LINK[item.type](item.id))}>
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Phê duyệt">
                        <IconButton
                          size="small" color="success"
                          onClick={() => { setReviewing({ item, action: 'approve' }); setNotes(''); }}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Từ chối">
                        <IconButton
                          size="small" color="error"
                          onClick={() => { setReviewing({ item, action: 'reject' }); setNotes(''); }}
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small" icon={TYPE_ICON[item.type] as React.ReactElement}
                          label={TYPE_LABEL[item.type]} variant="outlined"
                        />
                        <Typography variant="body1" fontWeight={500}>
                          {item.title}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        {item.occupation && (
                          <Typography variant="caption" color="text.secondary">
                            {item.occupation}{item.skill_level !== null ? ` · Bậc ${item.skill_level}` : ''}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Tạo lúc: {dayjs(item.created_at).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={!!reviewing} onClose={() => setReviewing(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {reviewing?.action === 'approve' ? 'Phê duyệt' : 'Từ chối'}: {reviewing?.item.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={3}
            label={reviewing?.action === 'approve' ? 'Ghi chú phê duyệt (tuỳ chọn)' : 'Lý do từ chối'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewing(null)}>Hủy</Button>
          <Button
            variant="contained"
            color={reviewing?.action === 'approve' ? 'success' : 'error'}
            onClick={handleSubmit}
            disabled={reviewMutation.isPending || (reviewing?.action === 'reject' && !notes.trim())}
            startIcon={reviewing?.action === 'approve' ? <CheckCircle /> : <Cancel />}
          >
            {reviewing?.action === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
