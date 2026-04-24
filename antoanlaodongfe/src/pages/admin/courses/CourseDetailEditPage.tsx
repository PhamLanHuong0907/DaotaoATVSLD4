import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Stack,
  Paper, IconButton, Tooltip, LinearProgress, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack, CheckCircle, Cancel, Delete, Edit, AccessTime,
  AutoAwesome, Image as ImageIcon, Refresh, ExpandMore,
  Videocam, OndemandVideo, Settings as SettingsIcon,
  Upload, CloudUpload, Add, DeleteOutline,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CourseAssignmentCard from '@/components/common/CourseAssignmentCard';
import CourseProgressTable from '@/components/common/CourseProgressTable';
import { courseApi, courseVideoTaskApi, type CourseResponse, type ImageGenConfig, type VideoGenConfig, type GenerateLessonVideoResponse, type GenerateVideosResponse, type LessonResponse } from '@/api/courseApi';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';
import { formatDateTime } from '@/utils/formatters';
import LessonMarkdown from '@/components/common/LessonMarkdown';
import RichTextEditor from '@/components/common/RichTextEditor';
import { useAuth } from '@/contexts/AuthContext';

/** Build full image URL from the relative path returned by backend */
function imageUrl(path: string): string {
  // path like "/api/v1/images/course_001_lesson1_abc.png"
  // In dev, Vite proxy forwards /api/v1 → backend, so just use the path as-is
  return path;
}

export default function CourseDetailEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading, error } = useQuery<CourseResponse>({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.get(courseId || ''),
    enabled: !!courseId,
  });

  const statusMutation = useMutation({
    mutationFn: (data: { status: string; reviewed_by: string; review_notes?: string }) =>
      courseApi.updateStatus(courseId || '', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => courseApi.delete(courseId || ''),
    onSuccess: () => {
      enqueueSnackbar('Đã xoá khóa học', { variant: 'success' });
      navigate('/admin/courses');
    },
  });

  // Generate images for ALL lessons
  const generateAllMutation = useMutation({
    mutationFn: () => courseApi.generateImages(courseId || '', imageConfig),
    onSuccess: (data) => {
      enqueueSnackbar(`Đã sinh ảnh cho ${data.generated}/${data.total} bài học`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi sinh ảnh: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    },
  });

  // Generate image for a SINGLE lesson
  const [generatingLesson, setGeneratingLesson] = useState<number | null>(null);
  const generateLessonMutation = useMutation({
    mutationFn: (lessonOrder: number) => courseApi.generateLessonImage(courseId || '', lessonOrder, imageConfig),
    onSuccess: (data) => {
      enqueueSnackbar(`Đã sinh ảnh cho bài ${data.lesson_order}: ${data.lesson_title}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setGeneratingLesson(null);
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi sinh ảnh: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
      setGeneratingLesson(null);
    },
  });

  const handleGenerateLessonImage = (lessonOrder: number) => {
    setGeneratingLesson(lessonOrder);
    generateLessonMutation.mutate(lessonOrder);
  };

  // Streaming state cho video generation
  const [videoProgressLog, setVideoProgressLog] = useState<string[]>([]);
  const [videoCurrentStep, setVideoCurrentStep] = useState<string>('');
  const [generatingVideoLesson, setGeneratingVideoLesson] = useState<number | null>(null);

  // Generate videos for ALL lessons (polling)
  const generateAllVideosMutation = useMutation({
    mutationFn: async (): Promise<GenerateVideosResponse> => {
      setVideoProgressLog([]);
      setVideoCurrentStep('Đang khởi tạo...');
      return courseVideoTaskApi.generateAllVideos(
        courseId || '', videoConfig,
        (status) => {
          setVideoCurrentStep(status.current_step);
          setVideoProgressLog(status.progress.slice(-30));
        },
      );
    },
    onSuccess: (data) => {
      enqueueSnackbar(`Đã sinh video cho ${data.generated}/${data.total} bài học`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setVideoCurrentStep('');
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi sinh video: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
      setVideoCurrentStep('');
    },
  });

  // Generate video for a SINGLE lesson (polling)
  const generateLessonVideoMutation = useMutation({
    mutationFn: async (lessonOrder: number): Promise<GenerateLessonVideoResponse> => {
      setVideoProgressLog([]);
      setVideoCurrentStep('Đang khởi tạo...');
      return courseVideoTaskApi.generateLessonVideo(
        courseId || '', lessonOrder, videoConfig,
        (status) => {
          setVideoCurrentStep(status.current_step);
          setVideoProgressLog(status.progress.slice(-30));
        },
      );
    },
    onSuccess: (data) => {
      enqueueSnackbar(`Đã sinh video cho bài ${data.lesson_order}: ${data.lesson_title}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setGeneratingVideoLesson(null);
      setVideoCurrentStep('');
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi sinh video: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
      setGeneratingVideoLesson(null);
      setVideoCurrentStep('');
    },
  });

  const handleGenerateLessonVideo = (lessonOrder: number) => {
    setGeneratingVideoLesson(lessonOrder);
    generateLessonVideoMutation.mutate(lessonOrder);
  };

  // ===== Upload ảnh/video thủ công =====
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUploadLesson, setPendingUploadLesson] = useState<number | null>(null);
  const [uploadingImageLesson, setUploadingImageLesson] = useState<number | null>(null);
  const [uploadingVideoLesson, setUploadingVideoLesson] = useState<number | null>(null);

  const uploadImageMut = useMutation({
    mutationFn: ({ order, file }: { order: number; file: File }) =>
      courseApi.uploadLessonImage(courseId || '', order, file),
    onSuccess: (data) => {
      enqueueSnackbar(`Đã tải ảnh cho bài ${data.lesson_order}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setUploadingImageLesson(null);
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi tải ảnh: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
      setUploadingImageLesson(null);
    },
  });

  const uploadVideoMut = useMutation({
    mutationFn: ({ order, file }: { order: number; file: File }) =>
      courseApi.uploadLessonVideo(courseId || '', order, file),
    onSuccess: (data) => {
      enqueueSnackbar(`Đã tải video cho bài ${data.lesson_order}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setUploadingVideoLesson(null);
    },
    onError: (err) => {
      enqueueSnackbar(`Lỗi tải video: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
      setUploadingVideoLesson(null);
    },
  });

  const triggerUploadImage = (lessonOrder: number) => {
    setPendingUploadLesson(lessonOrder);
    imageInputRef.current?.click();
  };
  const triggerUploadVideo = (lessonOrder: number) => {
    setPendingUploadLesson(lessonOrder);
    videoInputRef.current?.click();
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || pendingUploadLesson == null) return;
    setUploadingImageLesson(pendingUploadLesson);
    uploadImageMut.mutate({ order: pendingUploadLesson, file: f });
  };
  const onVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || pendingUploadLesson == null) return;
    setUploadingVideoLesson(pendingUploadLesson);
    uploadVideoMut.mutate({ order: pendingUploadLesson, file: f });
  };

  // Config state
  // ===== Chỉnh sửa nội dung bài học =====
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonResponse>({
    order: 1, title: '', theory: '', scenario: '', safety_notes: '', duration_minutes: 30,
  });

  const saveLessonsMut = useMutation({
    mutationFn: (lessons: LessonResponse[]) =>
      courseApi.update(courseId || '', { lessons }),
    onSuccess: () => {
      enqueueSnackbar('Đã lưu thay đổi bài học', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
    },
    onError: (err: Error) => enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' }),
  });

  const openAddLesson = () => {
    const maxOrder = Math.max(0, ...(course?.lessons ?? []).map((l) => l.order));
    setEditingLesson(null);
    setLessonForm({
      order: maxOrder + 1, title: '', theory: '', scenario: '',
      safety_notes: '', duration_minutes: 30,
    });
    setLessonDialogOpen(true);
  };
  const openEditLesson = (l: LessonResponse) => {
    setEditingLesson(l);
    setLessonForm({ ...l });
    setLessonDialogOpen(true);
  };
  const saveLessonForm = () => {
    const existing = course?.lessons ?? [];
    let updated: LessonResponse[];
    if (editingLesson) {
      updated = existing.map((l) => (l.order === editingLesson.order ? lessonForm : l));
    } else {
      updated = [...existing, lessonForm];
    }
    updated.sort((a, b) => a.order - b.order);
    saveLessonsMut.mutate(updated, { onSuccess: () => setLessonDialogOpen(false) });
  };
  const deleteLesson = (order: number) => {
    if (!confirm(`Xoá bài học #${order}?`)) return;
    const updated = (course?.lessons ?? [])
      .filter((l) => l.order !== order)
      .map((l, i) => ({ ...l, order: i + 1 }));
    saveLessonsMut.mutate(updated);
  };

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [imageConfig, setImageConfig] = useState<ImageGenConfig>({
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
  });
  const [videoConfig, setVideoConfig] = useState<VideoGenConfig>({
    model_name: 'kling-v1',
    duration: '10',
    mode: 'std',
    aspect_ratio: '16:9',
    sound: false,
    num_segments: 3,
  });

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'approved', reviewed_by: user?.id || '' });
      enqueueSnackbar('Đã phê duyệt khóa học', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      await statusMutation.mutateAsync({ status: 'rejected', reviewed_by: user?.id || '', review_notes: rejectNotes });
      enqueueSnackbar('Đã từ chối khóa học', { variant: 'success' });
      setShowRejectDialog(false);
    } catch (err) {
      enqueueSnackbar(`Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}`, { variant: 'error' });
    }
  };

  if (isLoading) return <LoadingOverlay />;
  if (error || !course) {
    return (
      <Alert severity="error" action={<Button onClick={() => navigate('/admin/courses')}>Quay lại</Button>}>
        Không thể tải thông tin khóa học.
      </Alert>
    );
  }

  const canReview = course.status === 'draft' || course.status === 'pending_review';
  const totalDuration = course.lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;
  const hasAnyImage = course.lessons?.some((l) => l.image_url);
  const hasAnyVideo = course.lessons?.some((l) => l.video_url);

  return (
    <>
      <input
        type="file" accept="image/*" hidden ref={imageInputRef}
        onChange={onImageFileChange}
      />
      <input
        type="file" accept="video/*" hidden ref={videoInputRef}
        onChange={onVideoFileChange}
      />

      <PageHeader
        title={course.title}
        action={
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/courses')}>
            Quay lại
          </Button>
        }
      />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/admin/courses/${courseId}/edit`)}>
          Chỉnh sửa
        </Button>
        <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setShowConfigDialog(true)}>
          Cấu hình AI
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={generateAllMutation.isPending ? <CircularProgress size={18} /> : <AutoAwesome />}
          onClick={() => generateAllMutation.mutate()}
          disabled={generateAllMutation.isPending || !course.lessons?.length}
        >
          {generateAllMutation.isPending ? 'Đang sinh ảnh...' : hasAnyImage ? 'Sinh lại ảnh tất cả' : 'Sinh ảnh minh họa (AI)'}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={generateAllVideosMutation.isPending ? <CircularProgress size={18} /> : <Videocam />}
          onClick={() => generateAllVideosMutation.mutate()}
          disabled={generateAllVideosMutation.isPending || !course.lessons?.length}
        >
          {generateAllVideosMutation.isPending ? 'Đang sinh video...' : hasAnyVideo ? 'Sinh lại video tất cả' : 'Sinh video minh họa (AI)'}
        </Button>
        {canReview && (
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleApprove} disabled={statusMutation.isPending}>
            Phê duyệt
          </Button>
        )}
        {canReview && (
          <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setShowRejectDialog(true)}>
            Từ chối
          </Button>
        )}
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setShowDeleteDialog(true)}>
          Xoá
        </Button>
      </Box>

      {/* Generate all images progress */}
      {generateAllMutation.isPending && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<AutoAwesome />}>
          <Typography variant="body2" fontWeight={500}>
            Đang sinh ảnh minh họa cho {course.lessons?.length} bài học bằng AI (DALL-E 3)...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mỗi bài học mất khoảng 10-20 giây. Vui lòng chờ.
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* Generate video progress (streaming) */}
      {(generateAllVideosMutation.isPending || generateLessonVideoMutation.isPending) && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<Videocam />}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Đang sinh video bằng AI (Kling + OpenAI TTS)
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            {videoCurrentStep || 'Đang khởi tạo...'}
          </Typography>
          <LinearProgress sx={{ mt: 1, mb: 1 }} />
          {videoProgressLog.length > 1 && (
            <Box
              sx={{
                mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1,
                maxHeight: 150, overflow: 'auto',
                fontFamily: 'monospace', fontSize: 11,
              }}
            >
              {videoProgressLog.map((line, i) => (
                <Box key={i} sx={{ color: i === videoProgressLog.length - 1 ? 'primary.main' : 'text.secondary' }}>
                  ▸ {line}
                </Box>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
              <Box sx={{ mt: 0.5 }}><StatusChip status={course.status} size="medium" /></Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Nghề</Typography>
              <Typography fontWeight={500}>{course.occupation}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Bậc thợ</Typography>
              <Typography fontWeight={500}>{course.skill_level}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Nhóm</Typography>
              <Typography fontWeight={500}>{trainingGroupLabels[course.training_group] || course.training_group}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
              <Typography fontWeight={500}>{formatDateTime(course.created_at)}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Số bài học</Typography>
              <Typography variant="h6" fontWeight={700}>{course.lessons?.length ?? 0}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">Tổng thời lượng</Typography>
              <Typography variant="h6" fontWeight={700}>{totalDuration} phút</Typography>
            </Grid>
          </Grid>

          {course.description && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">Mô tả</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{course.description}</Typography>
            </>
          )}

          {course.objectives?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">Mục tiêu khóa học</Typography>
              <Stack spacing={0.5}>
                {course.objectives.map((obj, i) => (
                  <Typography key={i} variant="body2">• {obj}</Typography>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assignment to departments */}
      <CourseAssignmentCard
        courseId={course.id}
        initialDepartmentIds={course.assigned_department_ids || []}
        initialMandatory={course.is_mandatory || false}
      />

      {/* Learner progress */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Tiến độ học viên
        </Typography>
        <CourseProgressTable courseId={course.id} />
      </Box>

      {/* Lessons */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Danh sách bài học ({course.lessons?.length ?? 0})
          </Typography>
          <Button size="small" variant="outlined" startIcon={<Add />} onClick={openAddLesson}>
            Thêm bài học
          </Button>
        </Stack>
        {(course.lessons?.length ?? 0) > 0 && course.lessons!.map((lesson) => (
            <Accordion
              key={lesson.order}
              disableGutters
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:not(:last-child)': { borderBottom: 0 },
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                  <Chip label={lesson.order} size="small" color="primary" sx={{ fontWeight: 700, minWidth: 28 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{lesson.title}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {lesson.image_url && (
                      <Chip label="Có ảnh" size="small" color="secondary" variant="outlined" sx={{ height: 22 }} />
                    )}
                    {lesson.video_url && (
                      <Chip label="Có video" size="small" color="info" variant="outlined" sx={{ height: 22 }} />
                    )}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">{lesson.duration_minutes} phút</Typography>
                    </Stack>
                    <Tooltip title="Sửa nội dung bài học">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditLesson(lesson); }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoá bài học">
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.order); }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2.5, pb: 3, px: 3 }}>
                {/* Ảnh minh họa */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {lesson.image_url ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box
                        component="img"
                        src={imageUrl(lesson.image_url)}
                        alt={lesson.title}
                        sx={{
                          width: 160,
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.85 },
                        }}
                        onClick={() => window.open(imageUrl(lesson.image_url!), '_blank')}
                      />
                      <Stack spacing={0.5}>
                        <Tooltip title="Sinh lại ảnh bằng AI">
                          <IconButton
                            size="small"
                            onClick={() => handleGenerateLessonImage(lesson.order)}
                            disabled={generatingLesson === lesson.order}
                          >
                            {generatingLesson === lesson.order ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Tải ảnh thủ công">
                          <IconButton
                            size="small"
                            onClick={() => triggerUploadImage(lesson.order)}
                            disabled={uploadingImageLesson === lesson.order}
                          >
                            {uploadingImageLesson === lesson.order ? <CircularProgress size={16} /> : <CloudUpload fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={generatingLesson === lesson.order ? <CircularProgress size={16} /> : <ImageIcon />}
                        onClick={() => handleGenerateLessonImage(lesson.order)}
                        disabled={generatingLesson === lesson.order}
                      >
                        {generatingLesson === lesson.order ? 'Đang sinh...' : 'Sinh ảnh (AI)'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={uploadingImageLesson === lesson.order ? <CircularProgress size={16} /> : <Upload />}
                        onClick={() => triggerUploadImage(lesson.order)}
                        disabled={uploadingImageLesson === lesson.order}
                      >
                        {uploadingImageLesson === lesson.order ? 'Đang tải...' : 'Tải ảnh lên'}
                      </Button>
                    </Stack>
                  )}
                </Box>

                {/* Video minh họa */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {lesson.video_url ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Box
                        component="video"
                        src={lesson.video_url}
                        controls
                        sx={{
                          width: 280,
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Stack spacing={0.5}>
                        <Tooltip title="Sinh lại video bằng AI">
                          <IconButton
                            size="small"
                            onClick={() => handleGenerateLessonVideo(lesson.order)}
                            disabled={generatingVideoLesson === lesson.order}
                          >
                            {generatingVideoLesson === lesson.order ? <CircularProgress size={16} /> : <Refresh fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Tải video thủ công">
                          <IconButton
                            size="small"
                            onClick={() => triggerUploadVideo(lesson.order)}
                            disabled={uploadingVideoLesson === lesson.order}
                          >
                            {uploadingVideoLesson === lesson.order ? <CircularProgress size={16} /> : <CloudUpload fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        startIcon={generatingVideoLesson === lesson.order ? <CircularProgress size={16} /> : <OndemandVideo />}
                        onClick={() => handleGenerateLessonVideo(lesson.order)}
                        disabled={generatingVideoLesson === lesson.order}
                      >
                        {generatingVideoLesson === lesson.order ? 'Đang sinh...' : 'Sinh video (AI)'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={uploadingVideoLesson === lesson.order ? <CircularProgress size={16} /> : <Upload />}
                        onClick={() => triggerUploadVideo(lesson.order)}
                        disabled={uploadingVideoLesson === lesson.order}
                      >
                        {uploadingVideoLesson === lesson.order ? 'Đang tải...' : 'Tải video lên'}
                      </Button>
                    </Stack>
                  )}
                </Box>

                {/* Lý thuyết */}
                {lesson.theory && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" color="primary.main" gutterBottom>Lý thuyết</Typography>
                    <LessonMarkdown>{lesson.theory}</LessonMarkdown>
                  </Box>
                )}

                {/* Tình huống thực tế */}
                {lesson.scenario && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>Tình huống thực tế</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.50' }}>
                      <LessonMarkdown>{lesson.scenario}</LessonMarkdown>
                    </Paper>
                  </Box>
                )}

                {/* Lưu ý an toàn */}
                {lesson.safety_notes && (
                  <Alert severity="error" icon={false}>
                    <Typography variant="subtitle2" gutterBottom>Lưu ý an toàn</Typography>
                    <LessonMarkdown>{lesson.safety_notes}</LessonMarkdown>
                  </Alert>
                )}

                {!lesson.theory && !lesson.scenario && !lesson.safety_notes && (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Nội dung bài học chưa được cập nhật.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
      </Box>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onClose={() => setShowRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Từ chối khóa học</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3}
            label="Lý do từ chối" placeholder="Nhập lý do từ chối..."
            value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowRejectDialog(false)}>Hủy</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={statusMutation.isPending}>Từ chối</Button>
        </DialogActions>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cấu hình sinh ảnh & video (AI)</DialogTitle>
        <DialogContent>
          {/* Image Config */}
          <Typography variant="subtitle2" color="primary" sx={{ mt: 1, mb: 1.5 }}>Sinh ảnh (DALL-E)</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Model</InputLabel>
              <Select value={imageConfig.model} label="Model" onChange={(e) => setImageConfig((p) => ({ ...p, model: e.target.value }))}>
                <MenuItem value="dall-e-3">DALL-E 3</MenuItem>
                <MenuItem value="dall-e-2">DALL-E 2</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Kích thước</InputLabel>
              <Select value={imageConfig.size} label="Kích thước" onChange={(e) => setImageConfig((p) => ({ ...p, size: e.target.value }))}>
                <MenuItem value="1024x1024">1024x1024</MenuItem>
                <MenuItem value="1024x1792">1024x1792 (dọc)</MenuItem>
                <MenuItem value="1792x1024">1792x1024 (ngang)</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Chất lượng</InputLabel>
              <Select value={imageConfig.quality} label="Chất lượng" onChange={(e) => setImageConfig((p) => ({ ...p, quality: e.target.value }))}>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="hd">HD</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* Video Config */}
          <Typography variant="subtitle2" color="info.main" sx={{ mb: 1.5 }}>Sinh video (Kling AI)</Typography>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Model</InputLabel>
              <Select value={videoConfig.model_name} label="Model" onChange={(e) => setVideoConfig((p) => ({ ...p, model_name: e.target.value }))}>
                <MenuItem value="kling-v1">Kling v1 (rẻ)</MenuItem>
                <MenuItem value="kling-v1-6">Kling v1.6</MenuItem>
                <MenuItem value="kling-v2-master">Kling v2 Master</MenuItem>
                <MenuItem value="kling-v2-1-master">Kling v2.1 Master</MenuItem>
                <MenuItem value="kling-v2-6">Kling v2.6 (có tiếng)</MenuItem>
                <MenuItem value="kling-v3">Kling v3 (mới nhất, có tiếng)</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Thời lượng mỗi đoạn</InputLabel>
              <Select value={videoConfig.duration} label="Thời lượng mỗi đoạn" onChange={(e) => setVideoConfig((p) => ({ ...p, duration: e.target.value }))}>
                <MenuItem value="5">5 giây</MenuItem>
                <MenuItem value="10">10 giây</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Số đoạn ghép</InputLabel>
              <Select value={videoConfig.num_segments} label="Số đoạn ghép" onChange={(e) => setVideoConfig((p) => ({ ...p, num_segments: Number(e.target.value) }))}>
                <MenuItem value={1}>1 đoạn</MenuItem>
                <MenuItem value={2}>2 đoạn</MenuItem>
                <MenuItem value={3}>3 đoạn (mặc định)</MenuItem>
                <MenuItem value={4}>4 đoạn</MenuItem>
                <MenuItem value={5}>5 đoạn</MenuItem>
                <MenuItem value={6}>6 đoạn</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Tổng thời lượng video = {videoConfig.num_segments} × {videoConfig.duration}s = {videoConfig.num_segments * Number(videoConfig.duration)}s
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Chế độ</InputLabel>
              <Select value={videoConfig.mode} label="Chế độ" onChange={(e) => setVideoConfig((p) => ({ ...p, mode: e.target.value }))}>
                <MenuItem value="std">Standard (nhanh, rẻ)</MenuItem>
                <MenuItem value="pro">Professional (chất lượng cao)</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Tỉ lệ khung hình</InputLabel>
              <Select value={videoConfig.aspect_ratio} label="Tỉ lệ khung hình" onChange={(e) => setVideoConfig((p) => ({ ...p, aspect_ratio: e.target.value }))}>
                <MenuItem value="16:9">16:9 (ngang)</MenuItem>
                <MenuItem value="9:16">9:16 (dọc)</MenuItem>
                <MenuItem value="1:1">1:1 (vuông)</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={videoConfig.sound} onChange={(e) => setVideoConfig((p) => ({ ...p, sound: e.target.checked }))} />}
              label="Có âm thanh"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowConfigDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Xoá khóa học"
        message="Bạn có chắc chắn muốn xoá khóa học này?"
        confirmText="Xoá"
        confirmColor="error"
        onConfirm={() => { deleteMutation.mutate(); setShowDeleteDialog(false); }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Lesson Edit / Add Dialog */}
      <Dialog open={lessonDialogOpen} onClose={() => setLessonDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingLesson ? `Sửa bài học #${editingLesson.order}` : 'Thêm bài học mới'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Số thứ tự" type="number" sx={{ width: 120 }}
                value={lessonForm.order}
                onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value, 10) || 1 })}
              />
              <TextField
                label="Thời lượng (phút)" type="number" sx={{ width: 160 }}
                value={lessonForm.duration_minutes}
                onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value, 10) || 0 })}
              />
              <TextField
                fullWidth label="Tiêu đề bài học"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              />
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Lý thuyết
              </Typography>
              <RichTextEditor
                value={lessonForm.theory || ''}
                onChange={(html) => setLessonForm({ ...lessonForm, theory: html })}
                placeholder="Nhập nội dung lý thuyết..."
                minHeight={200}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Tình huống thực tế (tuỳ chọn)
              </Typography>
              <RichTextEditor
                value={lessonForm.scenario || ''}
                onChange={(html) => setLessonForm({ ...lessonForm, scenario: html })}
                placeholder="Mô tả tình huống thực tế..."
                minHeight={140}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Lưu ý an toàn (tuỳ chọn)
              </Typography>
              <RichTextEditor
                value={lessonForm.safety_notes || ''}
                onChange={(html) => setLessonForm({ ...lessonForm, safety_notes: html })}
                placeholder="Các lưu ý an toàn..."
                minHeight={140}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLessonDialogOpen(false)}>Huỷ</Button>
          <Button
            variant="contained"
            onClick={saveLessonForm}
            disabled={!lessonForm.title.trim() || saveLessonsMut.isPending}
          >
            {saveLessonsMut.isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}