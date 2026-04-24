import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, AlertTitle,
} from '@mui/material';
import { Delete, CheckCircle, Visibility, FileUpload, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { questionApi, type QuestionResponse } from '@/api/questionApi';
import type { QuestionType, DifficultyLevel, ApprovalStatus } from '@/types/enums';
import { questionTypeLabels, difficultyLabels, approvalStatusLabels, trainingGroupLabels } from '@/utils/vietnameseLabels';
import { useAuth } from '@/contexts/AuthContext';

const qtOptions = [{ value: '', label: 'Tất cả loại' }, ...Object.entries(questionTypeLabels).map(([v, l]) => ({ value: v, label: l }))];
const diffOptions = [{ value: '', label: 'Tất cả mức độ' }, ...Object.entries(difficultyLabels).map(([v, l]) => ({ value: v, label: l }))];
const statusOptions = [{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l }))];
const groupOptions = [{ value: '', label: 'Tất cả nhóm' }, ...Object.entries(trainingGroupLabels).map(([v, l]) => ({ value: v, label: l }))];
const levelOptions = [{ value: '', label: 'Tất cả bậc' }, ...[1, 2, 3, 4, 5, 6, 7].map(l => ({ value: String(l), label: `Bậc ${l}` }))];

const difficultyColors: Record<string, 'success' | 'warning' | 'error'> = { easy: 'success', medium: 'warning', hard: 'error' };

export default function QuestionListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [qType, setQType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 15;

  // Fetch available topic tags
  const { data: topicTags } = useQuery({
    queryKey: ['topic-tags'],
    queryFn: () => questionApi.getTopicTags(),
  });

  const topicOptions = [{ value: '', label: 'Tất cả chủ đề' }, ...(topicTags || []).map(t => ({ value: t, label: t }))];

  const { data, isLoading } = useQuery({
    queryKey: ['questions', {
      question_type: qType,
      difficulty,
      status,
      training_group: group,
      topic_tag: topic,
      skill_level: level,
      page,
      page_size: pageSize
    }],
    queryFn: () => questionApi.list({
      question_type: (qType || undefined) as QuestionType | undefined,
      difficulty: (difficulty || undefined) as DifficultyLevel | undefined,
      status: (status || undefined) as ApprovalStatus | undefined,
      training_group: group || undefined,
      topic_tag: topic || undefined,
      skill_level: level ? Number(level) : undefined,
      page, page_size: pageSize,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['questions'] }); enqueueSnackbar('Đã xoá câu hỏi', { variant: 'success' }); },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: () => questionApi.bulkApprove({ question_ids: Array.from(selected), reviewed_by: user?.id || '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] });
      enqueueSnackbar(`Đã duyệt ${selected.size} câu hỏi`, { variant: 'success' });
      setSelected(new Set());
    },
    onError: (err: Error) => enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' }),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pageItems = data?.items || [];
  const allPageSelected = pageItems.length > 0 && pageItems.every((q) => selected.has(q.id));
  const somePageSelected = pageItems.some((q) => selected.has(q.id));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => questionApi.importXlsx(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['questions'] });
      setImportResult(res);
      enqueueSnackbar(`Đã nhập ${res.created} câu hỏi (${res.skipped} bị bỏ qua)`, { variant: 'success' });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await questionApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-nhap-cau-hoi.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageItems.forEach((q) => next.delete(q.id));
      } else {
        pageItems.forEach((q) => next.add(q.id));
      }
      return next;
    });
  };

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Ngân hàng câu hỏi"
        subtitle="Quản lý và duyệt câu hỏi thi"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
            >
              Tải template
            </Button>
            <Button
              variant="outlined" startIcon={<FileUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              Nhập từ Excel
            </Button>
            {selected.size > 0 && (
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => bulkApproveMutation.mutate()} disabled={bulkApproveMutation.isPending}>
                Duyệt {selected.size} câu hỏi
              </Button>
            )}
          </Stack>
        }
      />
      <input
        type="file" accept=".xlsx,.xlsm" hidden ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField select size="small" label="Loại" value={qType} onChange={handleFilterChange(setQType)} sx={{ minWidth: 140, flexGrow: 1 }}>
          {qtOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Mức độ" value={difficulty} onChange={handleFilterChange(setDifficulty)} sx={{ minWidth: 130, flexGrow: 1 }}>
          {diffOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Trạng thái" value={status} onChange={handleFilterChange(setStatus)} sx={{ minWidth: 140, flexGrow: 1 }}>
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Nhóm huấn luyện" value={group} onChange={handleFilterChange(setGroup)} sx={{ minWidth: 180, flexGrow: 1 }}>
          {groupOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Chủ đề" value={topic} onChange={handleFilterChange(setTopic)} sx={{ minWidth: 160, flexGrow: 1 }}>
          {topicOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Bậc" value={level} onChange={handleFilterChange(setLevel)} sx={{ minWidth: 120, flexGrow: 1 }}>
          {levelOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : !data?.items?.length ? (
        <EmptyState message="Không tìm thấy câu hỏi nào phù hợp với bộ lọc." />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nội dung câu hỏi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mức độ</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Nghề / Bậc</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((q: QuestionResponse) => (
                  <TableRow key={q.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }} selected={selected.has(q.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.content}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip label={questionTypeLabels[q.question_type]} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={difficultyLabels[q.difficulty]} size="small" color={difficultyColors[q.difficulty]} /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{q.occupation}</Typography>
                      <Typography variant="caption" color="text.secondary">Bậc {q.skill_level}</Typography>
                    </TableCell>
                    <TableCell align="center"><StatusChip status={q.status} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết"><IconButton size="small" color="primary" onClick={() => navigate(`/admin/questions/${q.id}`)}><Visibility fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Xoá"><IconButton size="small" color="error" onClick={() => setDeleteId(q.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data && data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      <ConfirmDialog open={!!deleteId} title="Xoá câu hỏi" message="Xoá câu hỏi này?" confirmText="Xoá" confirmColor="error" onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />

      <Dialog open={!!importResult} onClose={() => setImportResult(null)} fullWidth maxWidth="sm">
        <DialogTitle>Kết quả nhập câu hỏi</DialogTitle>
        <DialogContent>
          {importResult && (
            <>
              <Alert severity={importResult.created > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                <AlertTitle>
                  Thành công: {importResult.created} · Bị bỏ qua: {importResult.skipped}
                </AlertTitle>
              </Alert>
              {importResult.errors.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Chi tiết lỗi:</Typography>
                  <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" component="div">{err}</Typography>
                    ))}
                  </Box>
                </>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                Cột bắt buộc: <code>content</code>, <code>question_type</code>, <code>occupation</code>,{' '}
                <code>skill_level</code>, <code>training_group</code>. Với MCQ cần thêm{' '}
                <code>option_a..d</code> + <code>correct_label</code>.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportResult(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
