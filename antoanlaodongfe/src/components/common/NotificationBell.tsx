import { useState } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem, ListItemButton,
  ListItemText, Divider, Button, Stack,
} from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { notificationApi } from '@/api/notificationApi';

export default function NotificationBell() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list({ page_size: 10 }),
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unread_count || 0;
  const items = data?.items || [];

  const handleClick = (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const handleItemClick = (id: string, link: string | null) => {
    markOne.mutate(id);
    handleClose();
    if (link) navigate(link);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unread} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 380, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Thông báo {unread > 0 && `(${unread} mới)`}
            </Typography>
            {unread > 0 && (
              <Button size="small" onClick={() => markAll.mutate()}>
                Đánh dấu đã đọc
              </Button>
            )}
          </Stack>
          <Divider />

          {items.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Không có thông báo nào
              </Typography>
            </Box>
          ) : (
            <List sx={{ overflow: 'auto', p: 0 }}>
              {items.map((n) => (
                <ListItem key={n.id} disablePadding divider>
                  <ListItemButton
                    onClick={() => handleItemClick(n.id, n.link)}
                    sx={{ bgcolor: n.is_read ? 'transparent' : 'action.hover' }}
                  >
                    <ListItemText
                      primary={n.title}
                      secondary={
                        <>
                          {n.body && (
                            <Typography variant="caption" component="span" display="block">
                              {n.body}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(n.created_at).format('HH:mm DD/MM/YYYY')}
                          </Typography>
                        </>
                      }
                      slotProps={{ primary: { fontWeight: n.is_read ? 400 : 600 } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
