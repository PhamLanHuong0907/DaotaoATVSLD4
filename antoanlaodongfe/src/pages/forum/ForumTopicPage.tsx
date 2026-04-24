import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Stack, Typography, Paper,
  IconButton, Tooltip, Avatar, Divider, Alert,
} from '@mui/material';
import {
  ArrowBack, ArrowUpward, CheckCircle, Lock, LockOpen, PushPin,
  Send, Delete, Verified,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { forumApi, type ForumReply } from '@/api/forumApi';
import { useAuth } from '@/contexts/AuthContext';
import { userRoleLabels } from '@/utils/vietnameseLabels';
import type { UserRole } from '@/types/enums';
import RichTextEditor from '@/components/common/RichTextEditor';
import RichContent from '@/components/common/RichContent';

function ReplyCard({
  reply, topicId, isStaff, isTopicAuthor, isLocked,
}: {
  reply: ForumReply;
  topicId: string;
  isStaff: boolean;
  isTopicAuthor: boolean;
  isLocked: boolean;
}) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const upvote = useMutation({
    mutationFn: () => forumApi.upvoteReply(topicId, reply.id),
    onSuccess: (t) => qc.setQueryData(['forum-topic', topicId], t),
  });

  const markAnswer = useMutation({
    mutationFn: () => forumApi.markAnswer(topicId, reply.id),
    onSuccess: (t) => {
      qc.setQueryData(['forum-topic', topicId], t);
      enqueueSnackbar('Đã đánh dấu là câu trả lời đúng', { variant: 'success' });
    },
  });

  const canMarkAnswer = (isTopicAuthor || isStaff) && !reply.is_answer && !isLocked;

  return (
    <Card variant="outlined" sx={{
      borderColor: reply.is_answer ? 'success.main' : 'divider',
      borderWidth: reply.is_answer ? 2 : 1,
    }}>
      <CardContent>
        <Stack direction="row" spacing={2}>
          {/* Vote column */}
          <Stack alignItems="center" sx={{ minWidth: 50 }}>
            <IconButton
              size="small" disabled={isLocked}
              color={reply.is_upvoted_by_me ? 'primary' : 'default'}
              onClick={() => upvote.mutate()}
            >
              <ArrowUpward />
            </IconButton>
            <Typography variant="h6">{reply.upvote_count}</Typography>
            {reply.is_answer && (
              <Tooltip title="Câu trả lời được chấp nhận">
                <Verified color="success" />
              </Tooltip>
            )}
          </Stack>

          {/* Body */}
          <Box sx={{ flex: 1 }}>
            {reply.is_answer && (
              <Chip
                size="small" color="success" icon={<CheckCircle />}
                label="Câu trả lời được chấp nhận" sx={{ mb: 1 }}
              />
            )}
            <Box sx={{ mb: 2 }}>
              <RichContent>{reply.content}</RichContent>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                  {reply.author_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="caption" fontWeight={500}>{reply.author_name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {userRoleLabels[reply.author_role as UserRole] || reply.author_role}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  · {dayjs(reply.created_at).format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Stack>
              {canMarkAnswer && (
                <Button
                  size="small" variant="outlined" color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => markAnswer.mutate()}
                >
                  Chấp nhận câu trả lời
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ForumTopicPage() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data: topic, isLoading } = useQuery({
    queryKey: ['forum-topic', topicId],
    queryFn: () => forumApi.get(topicId),
    enabled: !!topicId,
  });

  const [reply, setReply] = useState('');

  const upvote = useMutation({
    mutationFn: () => forumApi.upvoteTopic(topicId),
    onSuccess: (t) => qc.setQueryData(['forum-topic', topicId], t),
  });

  const sendReply = useMutation({
    mutationFn: () => forumApi.reply(topicId, reply.trim()),
    onSuccess: (t) => {
      qc.setQueryData(['forum-topic', topicId], t);
      setReply('');
      enqueueSnackbar('Đã gửi câu trả lời', { variant: 'success' });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const lock = useMutation({
    mutationFn: () => forumApi.lock(topicId),
    onSuccess: (t) => qc.setQueryData(['forum-topic', topicId], t),
  });

  const pin = useMutation({
    mutationFn: () => forumApi.pin(topicId),
    onSuccess: (t) => qc.setQueryData(['forum-topic', topicId], t),
  });

  const deleteTopic = useMutation({
    mutationFn: () => forumApi.delete(topicId),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá', { variant: 'success' });
      navigate('/forum');
    },
  });

  if (isLoading || !topic) return <Typography>Đang tải...</Typography>;

  const isStaff = user?.role === 'admin' || user?.role === 'training_officer';
  const isTopicAuthor = user?.id === topic.author_id;
  const canDelete = isTopicAuthor || isStaff;

  return (
    <>
      <PageHeader
        title={topic.title}
        action={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/forum')}>
            Quay lại diễn đàn
          </Button>
        }
      />

      {/* Topic header */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2}>
            {/* Vote */}
            <Stack alignItems="center" sx={{ minWidth: 60 }}>
              <IconButton
                color={topic.is_upvoted_by_me ? 'primary' : 'default'}
                onClick={() => upvote.mutate()}
              >
                <ArrowUpward />
              </IconButton>
              <Typography variant="h5">{topic.upvote_count}</Typography>
              <Typography variant="caption" color="text.secondary">votes</Typography>
            </Stack>

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {topic.is_pinned && <Chip size="small" icon={<PushPin />} label="Đã ghim" color="warning" />}
                {topic.is_resolved && <Chip size="small" icon={<CheckCircle />} label="Đã giải quyết" color="success" />}
                {topic.is_locked && <Chip size="small" icon={<Lock />} label="Đã khoá" />}
                {topic.tags.map((t) => (
                  <Chip key={t} size="small" label={t} variant="outlined" />
                ))}
              </Stack>

              <Box sx={{ mb: 2 }}>
                <RichContent>{topic.body}</RichContent>
              </Box>

              <Divider sx={{ mb: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                    {topic.author_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{topic.author_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userRoleLabels[topic.author_role as UserRole] || topic.author_role}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    · {dayjs(topic.created_at).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {isStaff && (
                    <>
                      <Tooltip title={topic.is_pinned ? 'Bỏ ghim' : 'Ghim'}>
                        <IconButton size="small" onClick={() => pin.mutate()}>
                          <PushPin fontSize="small" color={topic.is_pinned ? 'warning' : 'inherit'} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={topic.is_locked ? 'Mở khoá' : 'Khoá'}>
                        <IconButton size="small" onClick={() => lock.mutate()}>
                          {topic.is_locked ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {canDelete && (
                    <Tooltip title="Xoá">
                      <IconButton size="small" color="error" onClick={() => deleteTopic.mutate()}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Replies */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {topic.replies.length} câu trả lời
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        {topic.replies.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Chưa có câu trả lời nào. Hãy là người đầu tiên!
            </Typography>
          </Paper>
        ) : (
          topic.replies
            .slice()
            .sort((a, b) => {
              if (a.is_answer && !b.is_answer) return -1;
              if (!a.is_answer && b.is_answer) return 1;
              return b.upvote_count - a.upvote_count;
            })
            .map((r) => (
              <ReplyCard
                key={r.id}
                reply={r}
                topicId={topic.id}
                isStaff={isStaff}
                isTopicAuthor={isTopicAuthor}
                isLocked={topic.is_locked}
              />
            ))
        )}
      </Stack>

      {/* Reply form */}
      {topic.is_locked ? (
        <Alert severity="warning" icon={<Lock />}>
          Chủ đề này đã bị khoá. Không thể trả lời.
        </Alert>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Câu trả lời của bạn
            </Typography>
            <RichTextEditor
              value={reply}
              onChange={setReply}
              placeholder="Chia sẻ kinh nghiệm hoặc câu trả lời của bạn..."
              minHeight={150}
            />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
              <Button
                variant="contained" startIcon={<Send />}
                onClick={() => sendReply.mutate()}
                disabled={!reply.replace(/<[^>]*>/g, '').trim() || sendReply.isPending}
              >
                Gửi trả lời
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
}
