import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save, ArrowBack } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import DistributionEditor from '@/components/exam/DistributionEditor';
import { useExamTemplate, useUpdateTemplate } from '@/hooks/useExamTemplates';
import type { QuestionDistribution } from '@/types/examTemplate';
import { examTypeLabels, trainingGroupLabels } from '@/utils/vietnameseLabels';
import { useQuery } from '@tanstack/react-query';
import { occupationApi, type Occupation } from '@/api/catalogApi';

export default function TemplateEditPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: template, isLoading } = useExamTemplate(templateId || '');
  const updateMutation = useUpdateTemplate(templateId || '');
  // Thêm phần này vào đầu component nếu chưa có:
const { data: occupationsData } = useQuery({
  queryKey: ['occupations', 'all'],
  queryFn: () => occupationApi.list(false),
});

const occupationOptions = useMemo(() => [
  { value: '', label: 'Chọn ngành nghề' },
  ...(occupationsData?.map((o: Occupation) => ({ value: o.name, label: o.name })) ?? []),
], [occupationsData]);
  const [form, setForm] = useState({
    name: '',
    exam_type: '',
    training_group: '',
    occupation: '',
    skill_level: 3,
    total_questions: 30,
    duration_minutes: 45,
    passing_score: 5,
    excellent_threshold: 9,
    good_threshold: 7,
    average_threshold: 5,
  });
  const [distributions, setDistributions] = useState<QuestionDistribution[]>([]);

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        exam_type: template.exam_type,
        training_group: template.training_group,
        occupation: template.occupation,
        skill_level: template.skill_level,
        total_questions: template.total_questions,
        duration_minutes: template.duration_minutes,
        passing_score: template.passing_score,
        excellent_threshold: template.excellent_threshold,
        good_threshold: template.good_threshold,
        average_threshold: template.average_threshold,
      });
      setDistributions(template.distributions);
    }
  }, [template]);

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync({ ...form, distributions } as never);
      enqueueSnackbar('Cập nhật mẫu đề thi thành công!', { variant: 'success' });
      navigate(`/admin/templates/${templateId}`);
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  if (isLoading) return <LoadingOverlay />;

  return (
    <>
      <PageHeader
        title="Sửa mẫu đề thi"
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(`/admin/templates/${templateId}`)}>
            Quay lại
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Thông tin cơ bản
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Tên mẫu đề thi" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Loại thi" value={form.exam_type} onChange={(e) => updateField('exam_type', e.target.value)}>
                {Object.entries(examTypeLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Nhóm huấn luyện" value={form.training_group} onChange={(e) => updateField('training_group', e.target.value)}>
                {Object.entries(trainingGroupLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
  <TextField 
    select
    fullWidth 
    label="Nghề" 
    value={form.occupation} 
    onChange={(e) => updateField('occupation', e.target.value)}
  >
    {occupationOptions.map((option) => (
      <MenuItem key={option.value} value={option.value}>
        {option.label}
      </MenuItem>
    ))}
  </TextField>
</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField type="number" fullWidth label="Bậc thợ" value={form.skill_level} onChange={(e) => updateField('skill_level', Number(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 7 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Tổng số câu" value={form.total_questions} onChange={(e) => updateField('total_questions', Number(e.target.value))} slotProps={{ htmlInput: { min: 1 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Thời gian (phút)" value={form.duration_minutes} onChange={(e) => updateField('duration_minutes', Number(e.target.value))} slotProps={{ htmlInput: { min: 5 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Điểm đạt" value={form.passing_score} onChange={(e) => updateField('passing_score', Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Ngưỡng xếp loại</Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Giỏi (≥)" value={form.excellent_threshold} onChange={(e) => updateField('excellent_threshold', Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Khá (≥)" value={form.good_threshold} onChange={(e) => updateField('good_threshold', Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField type="number" fullWidth label="Trung bình (≥)" value={form.average_threshold} onChange={(e) => updateField('average_threshold', Number(e.target.value))} slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <DistributionEditor distributions={distributions} totalQuestions={form.total_questions} onChange={setDistributions} />
        </CardContent>
      </Card>

      {updateMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {updateMutation.error instanceof Error ? updateMutation.error.message : 'Có lỗi xảy ra'}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => navigate(`/admin/templates/${templateId}`)}>Hủy</Button>
        <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </Box>
    </>
  );
}
