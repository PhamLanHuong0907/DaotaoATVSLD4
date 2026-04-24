import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Button, Box, TextField, MenuItem, Pagination,
  Skeleton, IconButton, Tooltip, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
  Alert, List, ListItem, ListItemIcon, ListItemText, InputAdornment,
} from '@mui/material';
import {
  Upload, Delete, Download, AutoAwesome, Visibility,
  CheckCircle, Error as ErrorIcon, School, Quiz, Description, Search,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { documentApi, type DocumentListFilters, type DocumentResponse, type StreamEvent } from '@/api/documentApi';
import type { ApprovalStatus } from '@/types/enums';
import { approvalStatusLabels } from '@/utils/vietnameseLabels';
import { formatDateTime } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import dayjs from 'dayjs';

const docTypeLabels: Record<string, string> = {
  company_internal: 'Nội bộ công ty',
  safety_procedure: 'Quy trình an toàn',
  legal_document: 'Văn bản pháp luật',
  question_bank: 'Ngân hàng câu hỏi',
};

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.entries(approvalStatusLabels).map(([v, l]) => ({ value: v, label: l })),
];

const docTypeOptions = [
  { value: '', label: 'Tất cả loại tài liệu' },
  ...Object.entries(docTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const monthOptions = [
  { value: '', label: 'Tất cả tháng' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` })),
];

export default function DocumentListPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // 1. Filter States
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'generate'>('upload');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState('safety_procedure');
  const pageSize = 15;

  // 2. Search Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // 3. Data Fetching
  const { data, isLoading } = useQuery({
    queryKey: ['documents', { status, document_type: docType, search: debouncedSearch, uploaded_by: uploadedBy, year, month, page, page_size: pageSize }],
    queryFn: () => documentApi.list({
      status: (status || undefined) as ApprovalStatus | undefined,
      document_type: docType || undefined,
      title: debouncedSearch || undefined,
      uploaded_by: uploadedBy || undefined,
      year: year || undefined,
      month: month || undefined,
      page,
      page_size: pageSize
    } as DocumentListFilters),
  });

  // Enrichment Queries: Fetch details for documents on the current page to get missing uploader info
  const enrichmentResults = useQueries({
    queries: (data?.items || []).map((doc) => ({
      queryKey: ['document-detail-enrich', doc.id],
      queryFn: () => documentApi.get(doc.id),
      staleTime: 5 * 60 * 1000, // Cache for 5 mins
      enabled: !!data?.items && !doc.uploaded_by, // Only fetch if uploader is missing
    })),
  });

  // 4. Merged Items with Enriched Data
  const enrichedItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.map((doc, index) => {
      const enriched = enrichmentResults[index]?.data;
      if (enriched) {
        return { ...doc, uploaded_by: enriched.uploaded_by };
      }
      return doc;
    });
  }, [data?.items, enrichmentResults]);

  // 5. Filtering Logic (Client-side search on enriched data)
  const filteredItems = useMemo(() => {
    return enrichedItems.filter((doc) => {
      const matchSearch = debouncedSearch
        ? doc.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const matchUploadedBy = uploadedBy ? doc.uploaded_by === uploadedBy : true;

      const createdDate = dayjs(doc.created_at);
      const matchYear = year ? createdDate.year().toString() === year : true;
      const matchMonth = month ? (createdDate.month() + 1).toString() === month : true;

      return matchSearch && matchUploadedBy && matchYear && matchMonth;
    });
  }, [enrichedItems, debouncedSearch, uploadedBy, year, month]);

  // 6. Dynamic Options Calculation
  const uploadedByOptions = useMemo(() => {
    const uniqueUploaders = Array.from(new Set(enrichedItems.map((doc) => doc.uploaded_by).filter(Boolean)));
    return [
      { value: '', label: 'Tất cả người tải' },
      ...uniqueUploaders.map((u) => ({ value: u, label: u })),
    ];
  }, [enrichedItems]);

  const yearOptions = useMemo(() => {
    if (!data?.items) return [{ value: '', label: 'Tất cả năm' }];
    const uniqueYears = Array.from(
      new Set(data.items.map((doc) => dayjs(doc.created_at).year().toString()))
    ).sort((a, b) => Number(b) - Number(a));
    return [
      { value: '', label: 'Tất cả năm' },
      ...uniqueYears.map((y) => ({ value: y, label: y })),
    ];
  }, [data?.items]);

  // Streaming state
  const [streaming, setStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamMessage, setStreamMessage] = useState('');
  const [streamLogs, setStreamLogs] = useState<Array<{ icon: 'check' | 'error' | 'lesson' | 'question' | 'doc'; text: string }>>([]);
  const [streamDone, setStreamDone] = useState(false);
  const [streamError, setStreamError] = useState('');

  const uploadMutation = useMutation<unknown, Error, FormData>({
    mutationFn: (formData: FormData) => documentApi.upload(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      enqueueSnackbar('Tải lên thành công!', { variant: 'success' });
      setUploadDialogOpen(false);
    },
    onError: (err: Error) => enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); enqueueSnackbar('Đã xoá tài liệu', { variant: 'success' }); },
  });

  const resetStreamState = useCallback(() => {
    setStreaming(false);
    setStreamProgress(0);
    setStreamMessage('');
    setStreamLogs([]);
    setStreamDone(false);
    setStreamError('');
  }, []);

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    setStreamProgress(event.progress);
    setStreamMessage(event.message);

    switch (event.event) {
      case 'start':
        setStreamLogs((prev) => [...prev, { icon: 'doc', text: event.message }]);
        break;
      case 'start_chunks':
        setStreamLogs((prev) => [...prev, { icon: 'doc', text: event.message }]);
        break;
      case 'chunk_done':
        setStreamLogs((prev) => [...prev, { icon: 'check', text: event.message }]);
        break;
      case 'chunk_error':
        setStreamLogs((prev) => [...prev, { icon: 'error', text: event.message }]);
        break;
      case 'metadata_done':
        setStreamLogs((prev) => [...prev, { icon: 'lesson', text: event.message }]);
        break;
      case 'saving':
        setStreamLogs((prev) => [...prev, { icon: 'doc', text: event.message }]);
        break;
      case 'complete':
        setStreamLogs((prev) => [...prev, { icon: 'check', text: event.message }]);
        setStreamDone(true);
        break;
      case 'error':
        setStreamError(event.message);
        setStreamLogs((prev) => [...prev, { icon: 'error', text: event.message }]);
        break;
      default:
        if (event.message) {
          setStreamLogs((prev) => [...prev, { icon: 'doc', text: event.message }]);
        }
    }
  }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadTitle) { enqueueSnackbar('Vui lòng chọn file và nhập tên', { variant: 'warning' }); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      title: uploadTitle,
      document_type: uploadDocType,
      uploaded_by: user?.full_name || 'Hệ thống',
    }));

    if (uploadMode === 'upload') {
      uploadMutation.mutate(formData);
    } else {
      resetStreamState();
      setStreaming(true);
      try {
        await documentApi.uploadAndGenerateStream(formData, handleStreamEvent);
        qc.invalidateQueries({ queryKey: ['documents'] });
        qc.invalidateQueries({ queryKey: ['courses'] });
        qc.invalidateQueries({ queryKey: ['questions'] });
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : 'Lỗi không xác định');
      }
    }
  };

  const startGenerateFromExisting = async (docId: string) => {
    resetStreamState();
    setUploadMode('generate');
    setUploadDialogOpen(true);
    setStreaming(true);
    try {
      await documentApi.generateContentStream(docId, handleStreamEvent);
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['questions'] });
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  };

  const handleFilterChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Kho tài liệu"
        subtitle="Quản lý tài liệu huấn luyện ATVSLĐ"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Upload />} onClick={() => { setUploadMode('upload'); setUploadDialogOpen(true); }}>
              Tải lên
            </Button>
            <Button variant="contained" startIcon={<AutoAwesome />} onClick={() => { setUploadMode('generate'); setUploadDialogOpen(true); }}>
              AI tạo nội dung
            </Button>
          </Stack>
        }
      />

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        {/* 1. Thanh tìm kiếm (Không có chữ viền khung, chỉ dùng placeholder) */}
        <TextField
          placeholder="Tìm kiếm tài liệu..."
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          // Bỏ flexGrow: 1 để không bị chiếm hết chỗ. 
          // Set width dài ra một chút trên PC, và full 100% trên Mobile.
          sx={{ width: { xs: '100%', md: '380px' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />

        {/* 2. Các thanh lọc (Có chữ nằm viền khung nhờ thuộc tính 'label') */}
        <TextField
          select
          size="small"
          label="Loại tài liệu"
          value={docType}
          onChange={handleFilterChange(setDocType)}
          sx={{ minWidth: 200, flex: { xs: '1 1 45%', md: 'none' } }}
        >
          {docTypeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label="Trạng thái"
          value={status}
          onChange={handleFilterChange(setStatus)}
          sx={{ minWidth: 200, flex: { xs: '1 1 45%', md: 'none' } }}
        >
          {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label="Người tải lên"
          value={uploadedBy}
          onChange={handleFilterChange(setUploadedBy)}
          sx={{ minWidth: 200, flex: { xs: '1 1 45%', md: 'none' } }}
        >
          {uploadedByOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label="Năm"
          value={year}
          onChange={handleFilterChange(setYear)}
          sx={{ minWidth: 100, flex: { xs: '1 1 45%', md: 'none' } }}
        >
          {yearOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label="Tháng"
          value={month}
          onChange={handleFilterChange(setMonth)}
          sx={{ minWidth: 100, flex: { xs: '1 1 45%', md: 'none' } }}
        >
          {monthOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>
      {isLoading ? (
        <Paper variant="outlined">{Array.from({ length: 5 }).map((_, i) => <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="80%" /></Box>)}</Paper>
      ) : !filteredItems.length ? (
        <EmptyState message="Không tìm thấy tài liệu phù hợp với bộ lọc." />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Tên tài liệu</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Người tải</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((doc: DocumentResponse) => (
                  <TableRow key={doc.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{doc.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{doc.file_name}</Typography>
                    </TableCell>
                    <TableCell><Chip label={docTypeLabels[doc.document_type] || doc.document_type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2" fontWeight={500}>{doc.uploaded_by || '—'}</Typography></TableCell>
                    <TableCell align="center"><StatusChip status={doc.status} /></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatDateTime(doc.created_at)}</Typography></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết"><IconButton size="small" color="primary" onClick={() => navigate(`/admin/documents/${doc.id}`)}><Visibility fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Tải xuống"><IconButton size="small" href={documentApi.downloadUrl(doc.id)} target="_blank"><Download fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title={doc.status === 'approved' ? 'Tạo nội dung bằng AI từ tài liệu này' : 'Chỉ khả dụng khi tài liệu đã phê duyệt'}>
                        <span>
                          <IconButton
                            size="small" color="secondary"
                            disabled={doc.status !== 'approved' || streaming}
                            onClick={() => startGenerateFromExisting(doc.id)}
                          >
                            <AutoAwesome fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Xoá"><IconButton size="small" color="error" onClick={() => setDeleteId(doc.id)}><Delete fontSize="small" /></IconButton></Tooltip>
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

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => { if (!streaming || streamDone || streamError) { setUploadDialogOpen(false); resetStreamState(); setUploadTitle(''); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{uploadMode === 'generate' ? 'AI tạo khóa học & câu hỏi' : 'Tải lên tài liệu'}</DialogTitle>
        <DialogContent>
          {!streaming && (
            <>
              {uploadMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}
              {uploadMode === 'generate' && (
                <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                  AI sẽ đọc nội dung tài liệu, tự động tạo khóa học và câu hỏi.
                </Alert>
              )}
              <TextField fullWidth label="Tên tài liệu" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} sx={{ mb: 2, mt: 1 }} />
              <TextField select fullWidth label="Loại tài liệu" value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} sx={{ mb: 2 }}>
                {Object.entries(docTypeLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
              <Button variant="outlined" component="label" fullWidth>
                Chọn file (PDF, DOCX, XLSX, TXT)
                <input type="file" hidden ref={fileRef} accept=".pdf,.docx,.doc,.xlsx,.xls,.txt" />
              </Button>
            </>
          )}

          {streaming && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={streamProgress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: streamError ? 'error.main' : streamDone ? 'success.main' : 'primary.main',
                      },
                    }}
                  />
                </Box>
                <Typography variant="body2" fontWeight={700}>
                  {streamProgress}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                {streamMessage}
              </Typography>
              {streamError && <Alert severity="error" sx={{ mb: 2 }}>{streamError}</Alert>}
              {streamDone && <Alert severity="success" sx={{ mb: 2 }}>Hoàn thành! Nội dung đã được tạo.</Alert>}
              {streamLogs.length > 0 && (
                <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
                  <List dense disablePadding>
                    {streamLogs.map((log, i) => (
                      <ListItem key={i} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {log.icon === 'check' && <CheckCircle fontSize="small" color="success" />}
                          {log.icon === 'error' && <ErrorIcon fontSize="small" color="error" />}
                          {log.icon === 'lesson' && <School fontSize="small" color="primary" />}
                          {log.icon === 'question' && <Quiz fontSize="small" color="secondary" />}
                          {log.icon === 'doc' && <Description fontSize="small" color="action" />}
                        </ListItemIcon>
                        <ListItemText primary={log.text} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {!streaming ? (
            <>
              <Button onClick={() => { setUploadDialogOpen(false); setUploadTitle(''); }}>Hủy</Button>
              <Button variant="contained" onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Đang tải...' : 'Bắt đầu'}
              </Button>
            </>
          ) : (
            <Button
              variant={streamDone ? 'contained' : 'outlined'}
              onClick={() => { setUploadDialogOpen(false); resetStreamState(); setUploadTitle(''); }}
              disabled={!streamDone && !streamError}
            >
              {streamDone || streamError ? 'Đóng' : 'Đang xử lý...'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteId} title="Xoá tài liệu" message="Bạn có chắc muốn xoá tài liệu này?" confirmText="Xoá" confirmColor="error" onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </>
  );
}
