import {
  Box,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import type { QuestionDistribution } from '@/types/examTemplate';
import { questionTypeLabels, difficultyLabels } from '@/utils/vietnameseLabels';
import { questionApi } from '@/api/questionApi';

interface DistributionEditorProps {
  distributions: QuestionDistribution[];
  totalQuestions: number;
  onChange: (distributions: QuestionDistribution[]) => void;
}

const questionTypeOptions = [
  { value: '', label: '(Tất cả)' },
  ...Object.entries(questionTypeLabels).map(([v, l]) => ({ value: v, label: l })),
];

const difficultyOptions = [
  { value: '', label: '(Tất cả)' },
  ...Object.entries(difficultyLabels).map(([v, l]) => ({ value: v, label: l })),
];

export default function DistributionEditor({ distributions, totalQuestions, onChange }: DistributionEditorProps) {
  const totalCount = distributions.reduce((sum, d) => sum + d.count, 0);
  const isMatch = totalCount === totalQuestions;

  // Fetch topic tags from dedicated endpoint
  const { data: topicOptions = [], isLoading: topicsLoading } = useQuery<string[]>({
    queryKey: ['question-topic-tags'],
    queryFn: () => questionApi.getTopicTags(),
    staleTime: 5 * 60 * 1000,
  });

  const handleAdd = () => {
    onChange([...distributions, { topic_tag: '', question_type: undefined, difficulty: undefined, count: 1 }]);
  };

  const handleRemove = (index: number) => {
    onChange(distributions.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof QuestionDistribution, value: string | number) => {
    const updated = distributions.map((d, i) => {
      if (i !== index) return d;
      if (field === 'count') return { ...d, count: Number(value) || 0 };
      if (field === 'question_type' || field === 'difficulty') {
        return { ...d, [field]: (value as string) || undefined };
      }
      return { ...d, [field]: String(value) };
    });
    onChange(updated);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Phân bổ câu hỏi
        </Typography>
        <Button size="small" startIcon={<Add />} onClick={handleAdd}>
          Thêm dòng
        </Button>
      </Box>

      {topicOptions.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Có <strong>{topicOptions.length}</strong> chủ đề từ ngân hàng câu hỏi &amp; khóa học. Click vào ô chủ đề để chọn hoặc gõ tên mới.
        </Alert>
      )}

      {!isMatch && distributions.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tổng số câu phân bổ: <strong>{totalCount}</strong> / Yêu cầu: <strong>{totalQuestions}</strong>
          {totalCount !== totalQuestions && ` (chênh ${Math.abs(totalCount - totalQuestions)} câu)`}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ minWidth: 220 }}>Chủ đề</TableCell>
              <TableCell>Loại câu hỏi</TableCell>
              <TableCell>Mức độ</TableCell>
              <TableCell sx={{ width: 80 }}>Số câu</TableCell>
              <TableCell sx={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Chưa có phân bổ. Nhấn "Thêm dòng" để bắt đầu.
                </TableCell>
              </TableRow>
            ) : (
              distributions.map((dist, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ minWidth: 220, overflow: 'visible' }}>
                    {topicsLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">Đang tải...</Typography>
                      </Box>
                    ) : (
                      <Autocomplete
                        size="small"
                        freeSolo
                        disablePortal={false}
                        options={topicOptions}
                        value={dist.topic_tag || ''}
                        onChange={(_, newValue) => {
                          handleChange(i, 'topic_tag', (newValue as string) || '');
                        }}
                        onInputChange={(_, newValue, reason) => {
                          if (reason === 'input') {
                            handleChange(i, 'topic_tag', newValue);
                          }
                        }}
                        filterOptions={(options, { inputValue }) => {
                          const filterVal = inputValue.toLowerCase();
                          return options.filter((opt) => opt.toLowerCase().includes(filterVal));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="standard"
                            placeholder="Chọn hoặc nhập chủ đề..."
                          />
                        )}
                        noOptionsText="Nhập tên chủ đề mới"
                        sx={{ minWidth: 180 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={dist.question_type || ''}
                      onChange={(e) => handleChange(i, 'question_type', e.target.value)}
                      variant="standard"
                    >
                      {questionTypeOptions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={dist.difficulty || ''}
                      onChange={(e) => handleChange(i, 'difficulty', e.target.value)}
                      variant="standard"
                    >
                      {difficultyOptions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      value={dist.count}
                      onChange={(e) => handleChange(i, 'count', e.target.value)}
                      variant="standard"
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => handleRemove(i)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
