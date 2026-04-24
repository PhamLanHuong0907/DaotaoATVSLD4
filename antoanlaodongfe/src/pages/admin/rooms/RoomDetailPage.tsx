import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack, Delete, Print, PersonAdd, Group, CheckCircle, RadioButtonUnchecked,
  Edit as EditIcon, HowToReg, FileCopy,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import PageHeader from '@/components/common/PageHeader';
import { useExamRoom, useRemoveRoomCandidate, useAddRoomCandidates, useBulkAddByDepartment } from '@/hooks/useExamRooms';
import { userApi } from '@/api/userApi';
import { departmentApi } from '@/api/departmentApi';
import { examRoomApi } from '@/api/examRoomApi';
import { examModeLabels } from '@/utils/vietnameseLabels';
import { getDynamicRoomStatus } from '@/utils/roomStatusHelper';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RoomDetailPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: room } = useExamRoom(roomId);
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
  });
  const deptName = useMemo(
    () => departments.find((d) => d.id === room?.department_id)?.name || room?.department_id || '',
    [departments, room],
  );

  // Candidate pool from same department
  const { data: poolUsers } = useQuery({
    queryKey: ['users', 'by-dept', room?.department_id],
    queryFn: () =>
      userApi.list({ department_id: room!.department_id, role: 'worker', is_active: true, page_size: 500 }),
    enabled: !!room?.department_id,
  });

  const addCandidates = useAddRoomCandidates(roomId);
  const removeCandidate = useRemoveRoomCandidate(roomId);
  const bulkAdd = useBulkAddByDepartment(roomId);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [scoreDialog, setScoreDialog] = useState<{ userId: string; fullName: string } | null>(null);
  const [scoreValue, setScoreValue] = useState<string>('');
  const [scoreNote, setScoreNote] = useState('');

  if (!room) return null;

  const availableUsers = (poolUsers?.items || []).filter(
    (u) => !room.candidates.some((c) => c.user_id === u.id),
  );

  const handleAdd = async () => {
    if (!selectedUserIds.length) return;
    try {
      await addCandidates.mutateAsync(selectedUserIds);
      enqueueSnackbar('Đã thêm thí sinh', { variant: 'success' });
      setSelectedUserIds([]);
      setAddOpen(false);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const handleBulkByDept = async () => {
    try {
      await bulkAdd.mutateAsync({ departmentId: room.department_id });
      enqueueSnackbar('Đã nạp toàn bộ nhân sự phòng ban', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCandidate.mutateAsync(userId);
      enqueueSnackbar('Đã xoá thí sinh', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const handleToggleAttendance = async (userId: string, current: boolean) => {
    try {
      await examRoomApi.markAttendance(roomId, [{ user_id: userId, attended: !current }]);
      enqueueSnackbar('Đã cập nhật điểm danh', { variant: 'success' });
      // refetch via cache invalidation done by calling the API directly — refresh
      window.location.reload();
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const openScoreDialog = (userId: string, fullName: string) => {
    setScoreDialog({ userId, fullName });
    setScoreValue('');
    setScoreNote('');
  };

  const handleSubmitScore = async () => {
    if (!scoreDialog) return;
    const score = Number(scoreValue);
    if (isNaN(score) || score < 0 || score > 10) {
      enqueueSnackbar('Điểm phải nằm trong khoảng 0-10', { variant: 'warning' });
      return;
    }
    try {
      await examRoomApi.submitOfflineScore(roomId, {
        user_id: scoreDialog.userId,
        total_score: score,
        note: scoreNote || undefined,
      });
      enqueueSnackbar('Đã ghi nhận điểm', { variant: 'success' });
      setScoreDialog(null);
      window.location.reload();
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const handlePrint = async () => {
    try {
      const eid = room.exam_ids?.[0] || room.exam_id;
      if (!eid) return;
      const blob = await examRoomApi.printExamPdf(eid);
      downloadBlob(blob, `de-thi-${room.name}.pdf`);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const handlePrintVariants = async () => {
    const eid = room.exam_ids?.[0] || room.exam_id;
    if (!eid) return;
    const input = window.prompt('Số mã đề muốn tạo (1-20):', '4');
    if (!input) return;
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 1 || count > 20) {
      enqueueSnackbar('Số mã đề phải nằm trong 1-20', { variant: 'warning' });
      return;
    }
    try {
      const blob = await examRoomApi.printExamVariants(eid, count);
      downloadBlob(blob, `de-thi-${room.name}-${count}-ma.zip`);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader
        title={room.name}
        subtitle={`${examModeLabels[room.exam_mode]} · ${deptName}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/rooms')}>Quay lại</Button>
            {room.exam_mode === 'onsite' && (
              <>
                <Button variant="outlined" color="primary" startIcon={<Print />} onClick={handlePrint}>
                  In đề PDF
                </Button>
                <Button variant="contained" color="primary" startIcon={<FileCopy />} onClick={handlePrintVariants}>
                  Tạo nhiều mã đề
                </Button>
              </>
            )}
          </Stack>
        }
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Thời gian</Typography>
              <Typography variant="body1">{dayjs(room.scheduled_start).format('DD/MM/YYYY HH:mm')}</Typography>
              <Typography variant="body2" color="text.secondary">đến {dayjs(room.scheduled_end).format('DD/MM/YYYY HH:mm')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Thí sinh</Typography>
              <Typography variant="h5">{room.candidates.length}/{room.capacity}</Typography>
              {room.location && (
                <Typography variant="body2" color="text.secondary">Địa điểm: {room.location}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}>
                {(() => {
                  const dyn = getDynamicRoomStatus(room);
                  return <Chip label={dyn.label} color={dyn.color} />;
                })()}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Danh sách thí sinh</Typography>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Group />} onClick={handleBulkByDept}>
              Nạp cả phòng ban
            </Button>
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAddOpen(true)}>
              Thêm thí sinh
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Mã NV</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Họ và tên</TableCell>
              {room.exam_mode === 'onsite' && <TableCell sx={{ fontWeight: 600 }}>Số báo danh</TableCell>}
              <TableCell align="center" sx={{ fontWeight: 600 }}>Có mặt</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {room.candidates.length === 0 && (
              <TableRow>
                <TableCell colSpan={room.exam_mode === 'onsite' ? 6 : 5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Chưa có thí sinh
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {room.candidates.map((c, idx) => (
              <TableRow key={c.user_id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{c.employee_id}</TableCell>
                <TableCell>{c.full_name}</TableCell>
                {room.exam_mode === 'onsite' && <TableCell>{c.seat_number || '—'}</TableCell>}
                <TableCell align="center">
                  <Tooltip title={c.attended ? 'Đã có mặt' : 'Chưa điểm danh'}>
                    <IconButton size="small" onClick={() => handleToggleAttendance(c.user_id, c.attended)}>
                      {c.attended ? (
                        <CheckCircle fontSize="small" color="success" />
                      ) : (
                        <RadioButtonUnchecked fontSize="small" color="disabled" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  {room.exam_mode === 'onsite' && (
                    <Tooltip title="Nhập điểm thi giấy">
                      <IconButton size="small" color="primary" onClick={() => openScoreDialog(c.user_id, c.full_name)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Xoá khỏi phòng thi">
                    <IconButton size="small" color="error" onClick={() => handleRemove(c.user_id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!scoreDialog} onClose={() => setScoreDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>Nhập điểm thi giấy</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Thí sinh: <strong>{scoreDialog?.fullName}</strong>
          </Typography>
          <TextField
            fullWidth type="number" label="Điểm (0-10)" value={scoreValue}
            onChange={(e) => setScoreValue(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.25 } }}
            autoFocus sx={{ mb: 2 }}
          />
          <TextField
            fullWidth multiline minRows={2} label="Ghi chú (tuỳ chọn)"
            value={scoreNote} onChange={(e) => setScoreNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScoreDialog(null)}>Hủy</Button>
          <Button variant="contained" startIcon={<HowToReg />} onClick={handleSubmitScore}>
            Lưu điểm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Thêm thí sinh vào phòng thi</DialogTitle>
        <DialogContent>
          <Autocomplete
            multiple
            sx={{ mt: 1 }}
            options={availableUsers}
            getOptionLabel={(u) => `${u.employee_id} — ${u.full_name}`}
            value={availableUsers.filter((u) => selectedUserIds.includes(u.id))}
            onChange={(_, v) => setSelectedUserIds(v.map((u) => u.id))}
            renderInput={(params) => <TextField {...params} label="Chọn người lao động" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!selectedUserIds.length}>
            Thêm ({selectedUserIds.length})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
