import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  Pagination,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Visibility, ArrowBack } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import ClassificationChip from '@/components/common/ClassificationChip';
import EmptyState from '@/components/common/EmptyState';
import { useExamSubmissions } from '@/hooks/useSubmissions';
import { formatScore, formatDateTime } from '@/utils/formatters';

export default function ExamSubmissionsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useExamSubmissions(examId || '', page, pageSize);

  return (
    <>
      <PageHeader
        title="Danh sách bài nộp"
        subtitle={`Kỳ thi: ${examId}`}
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/exams')}>
            Quay lại
          </Button>
        }
      />

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}><Skeleton variant="text" width="70%" /></Box>
          ))}
        </Paper>
      ) : !data?.items.length ? (
        <EmptyState message="Chưa có bài nộp nào cho kỳ thi này" />
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tổng: <strong>{data.total}</strong> bài nộp
            </Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã người dùng</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Điểm</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Xếp loại</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Đúng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ngày nộp</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Chi tiết</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((sub, index) => (
                  <TableRow key={sub.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{sub.user_id}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700} color={sub.total_score >= 5 ? 'success.main' : 'error.main'}>
                        {formatScore(sub.total_score)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <ClassificationChip classification={sub.classification} />
                    </TableCell>
                    <TableCell align="center">{sub.total_correct}/{sub.total_questions}</TableCell>
                    <TableCell>{formatDateTime(sub.submitted_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/exams/results/${sub.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={data.total_pages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}
    </>
  );
}
