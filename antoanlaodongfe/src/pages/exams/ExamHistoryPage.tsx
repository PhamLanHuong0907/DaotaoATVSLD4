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
import { Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import ClassificationChip from '@/components/common/ClassificationChip';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSubmissions } from '@/hooks/useSubmissions';
import { formatScore, formatDateTime } from '@/utils/formatters';

export default function ExamHistoryPage({ kind }: { kind?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useUserSubmissions(user?.id || '', page, pageSize, kind);

  const title = kind === 'trial' ? 'Lịch sử luyện thi' : 'Lịch sử thi';
  const subtitle = kind === 'trial' 
    ? 'Kết quả các bài ôn tập và thi thử của bạn' 
    : `Kết quả các bài thi của ${user?.full_name || ''}`;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
      />

      {isLoading ? (
        <Paper variant="outlined">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5 }}>
              <Skeleton variant="text" width="70%" />
            </Box>
          ))}
        </Paper>
      ) : !data?.items.length ? (
        <EmptyState
          message="Bạn chưa có bài thi nào"
          action={
            <Button variant="contained" onClick={() => navigate('/exams')} sx={{ mt: 2 }}>
              Xem danh sách bài thi
            </Button>
          }
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã kỳ thi</TableCell>
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
                    <TableCell>
                      <Typography variant="body2">{(page - 1) * pageSize + index + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.exam_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={sub.total_score >= 5 ? 'success.main' : 'error.main'}
                      >
                        {formatScore(sub.total_score)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <ClassificationChip classification={sub.classification} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {sub.total_correct}/{sub.total_questions}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDateTime(sub.submitted_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/exams/results/${sub.id}`)}
                        >
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
              <Pagination
                count={data.total_pages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </>
  );
}
