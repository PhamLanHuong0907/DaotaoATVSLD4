import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Card, CardContent, IconButton, List, ListItem, ListItemButton,
  ListItemText, Paper, Stack, TextField, Typography, Avatar, Chip, Divider,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Send, SmartToy, Person, Add, Delete, Description,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import MarkdownContent from '@/components/common/MarkdownContent';
import { aiTutorApi, type ChatMessage } from '@/api/aiTutorApi';

export default function AITutorPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['ai-sessions'],
    queryFn: () => aiTutorApi.listSessions(),
  });

  const { data: activeSession } = useQuery({
    queryKey: ['ai-session', activeSessionId],
    queryFn: () => aiTutorApi.getSession(activeSessionId!),
    enabled: !!activeSessionId,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length]);

  const sendMutation = useMutation({
    mutationFn: () =>
      aiTutorApi.send({
        session_id: activeSessionId || undefined,
        message: draft.trim(),
      }),
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      setDraft('');
      qc.invalidateQueries({ queryKey: ['ai-sessions'] });
      qc.setQueryData(['ai-session', session.id], session);
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiTutorApi.deleteSession(id),
    onSuccess: (_d, id) => {
      enqueueSnackbar('Đã xoá cuộc trò chuyện', { variant: 'success' });
      if (activeSessionId === id) setActiveSessionId(null);
      qc.invalidateQueries({ queryKey: ['ai-sessions'] });
    },
  });

  const handleSend = () => {
    if (!draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  const handleNew = () => {
    setActiveSessionId(null);
    setDraft('');
  };

  const renderMessage = (m: ChatMessage, i: number) => {
    const isUser = m.role === 'user';
    return (
      <Box
        key={i}
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Avatar sx={{ bgcolor: isUser ? 'primary.main' : 'success.main' }}>
          {isUser ? <Person /> : <SmartToy />}
        </Avatar>
        <Box sx={{ maxWidth: '75%' }}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              bgcolor: isUser ? 'primary.50' : 'background.paper',
              borderColor: isUser ? 'primary.light' : 'divider',
            }}
          >
            {isUser ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {m.content}
              </Typography>
            ) : (
              <MarkdownContent compact>{m.content}</MarkdownContent>
            )}
            {m.sources?.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  Nguồn tham khảo:
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {m.sources.map((src) => (
                    <Chip
                      key={src} size="small" icon={<Description fontSize="small" />}
                      label={src} variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
          <Typography
            variant="caption" color="text.secondary"
            sx={{ display: 'block', mt: 0.5, textAlign: isUser ? 'right' : 'left' }}
          >
            {dayjs(m.created_at).format('HH:mm')}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <>
      {!hideHeader && (
        <PageHeader
          title="Trợ lý AI ATVSLĐ"
          subtitle="Hỏi đáp với AI dựa trên kho tài liệu đã được phê duyệt"
        />
      )}

      <Grid container spacing={2}>
        {/* Session list */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 1 }}>
              <ListItemButton
                onClick={handleNew}
                sx={{ borderRadius: 1, mb: 1, bgcolor: !activeSessionId ? 'action.selected' : undefined }}
              >
                <Add fontSize="small" sx={{ mr: 1 }} />
                <ListItemText primary="Cuộc trò chuyện mới" />
              </ListItemButton>
              <Divider />
              <List dense disablePadding sx={{ maxHeight: 480, overflow: 'auto' }}>
                {sessions.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
                    Chưa có cuộc trò chuyện nào
                  </Typography>
                ) : (
                  sessions.map((s) => (
                    <ListItem
                      key={s.id}
                      disablePadding
                      secondaryAction={
                        <Tooltip title="Xoá">
                          <IconButton
                            size="small" edge="end"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemButton
                        selected={s.id === activeSessionId}
                        onClick={() => setActiveSessionId(s.id)}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemText
                          primary={s.title}
                          secondary={dayjs(s.updated_at).format('DD/MM HH:mm')}
                          slotProps={{
                            primary: { variant: 'body2', noWrap: true },
                            secondary: { variant: 'caption' },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat area */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Card variant="outlined" sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {!activeSession || activeSession.messages.length === 0 ? (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <SmartToy sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Chào bạn! Tôi là trợ lý AI ATVSLĐ
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 500, mb: 3 }}>
                    Hãy hỏi tôi bất kỳ câu hỏi nào về an toàn vệ sinh lao động, quy trình
                    làm việc an toàn, sơ cấp cứu, hoặc nội dung các khoá học bạn đang theo học.
                  </Typography>
                  <Stack spacing={1}>
                    {[
                      'Khi gặp tai nạn lao động trong hầm lò, tôi cần làm gì đầu tiên?',
                      'Quy định về sử dụng dụng cụ bảo hộ cá nhân?',
                      'Cách xử lý khi phát hiện rò rỉ khí?',
                    ].map((q) => (
                      <Chip
                        key={q} label={q} variant="outlined"
                        onClick={() => setDraft(q)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Stack>
                </Box>
              ) : (
                <>
                  {activeSession.messages.map(renderMessage)}
                  {sendMutation.isPending && (
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.main' }}><SmartToy /></Avatar>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Đang suy nghĩ...
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth multiline maxRows={4}
                  placeholder="Hỏi điều gì đó..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sendMutation.isPending}
                />
                <IconButton
                  color="primary"
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMutation.isPending}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  <Send />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Enter để gửi · Shift+Enter để xuống dòng
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
