import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Stack,
  Paper,
  Accordion, AccordionSummary, AccordionDetails, LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack, CheckCircle, Cancel, Delete, Edit, AccessTime,
  AutoAwesome, Image as ImageIcon, ExpandMore, MovieFilter,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PageHeader from '@/components/common/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CourseAssignmentCard from '@/components/common/CourseAssignmentCard';
import CourseProgressTable from '@/components/common/CourseProgressTable';
import { courseApi, type CourseResponse, type ImageGenConfig, type VideoGenConfig, courseVideoTaskApi } from '@/api/courseApi';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';
import { formatDateTime } from '@/utils/formatters';
import LessonMarkdown from '@/components/common/LessonMarkdown';
import { useAuth } from '@/contexts/AuthContext';

/** Build full image URL from the relative path returned by backend */
function imageUrl(path: string): string {
  // path like "/api/v1/images/course_001_lesson1_abc.png"
  // In dev, Vite proxy forwards /api/v1 → backend, so just use the path as-is
  return path;
}

export default function CourseDetailPage() {
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


  // ===== AI Generation Mutations =====
  const [generatingLesson, setGeneratingLesson] = useState<number | null>(null);
  const [generatingVideoLesson, setGeneratingVideoLesson] = useState<number | null>(null);
  
  // Streaming/Polling state
  const [videoProgressLog, setVideoProgressLog] = useState<string[]>([]);
  const [videoCurrentStep, setVideoCurrentStep] = useState<string>('');

  const [imageConfig] = useState<ImageGenConfig>({ model: 'dall-e-3', size: '1024x1024', quality: 'standard' });
  const [videoConfig] = useState<VideoGenConfig>({
    model_name: 'kling-v1', duration: '10', mode: 'std', aspect_ratio: '16:9', sound: false, num_segments: 3,
  });

  // Generate Image for Single Lesson
  const generateLessonImageMut = useMutation({
    mutationFn: (lessonOrder: number) => courseApi.generateLessonImage(courseId || '', lessonOrder, imageConfig),
    onSuccess: (data) => {
      enqueueSnackbar(`Đã sinh ảnh bài ${data.lesson_order}`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setGeneratingLesson(null);
    },
    onError: (err: any) => {
      enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' });
      setGeneratingLesson(null);
    }
  });

  // Generate Video for Single Lesson (Polling)
  const generateLessonVideoMut = useMutation({
    mutationFn: async (lessonOrder: number) => {
      setVideoProgressLog([]);
      setVideoCurrentStep('Đang khởi tạo...');
      return courseVideoTaskApi.generateLessonVideo(courseId || '', lessonOrder, videoConfig, (status) => {
        setVideoCurrentStep(status.current_step);
        setVideoProgressLog(status.progress.slice(-20));
      });
    },
    onSuccess: () => {
      enqueueSnackbar('Đã sinh video xong', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setGeneratingVideoLesson(null);
      setVideoCurrentStep('');
    },
    onError: (err: any) => {
      enqueueSnackbar(`Lỗi: ${err.message}`, { variant: 'error' });
      setGeneratingVideoLesson(null);
      setVideoCurrentStep('');
    }
  });

  // Generate Videos for ALL (Bulk)
  const generateAllVideosMut = useMutation({
    mutationFn: async () => {
      setVideoProgressLog([]);
      setVideoCurrentStep('Đang khởi tạo hàng loạt...');
      return courseVideoTaskApi.generateAllVideos(courseId || '', videoConfig, (status) => {
        setVideoCurrentStep(status.current_step);
        setVideoProgressLog(status.progress.slice(-30));
      });
    },
    onSuccess: (data) => {
      enqueueSnackbar(`Hoàn thành sinh video cho ${data.generated}/${data.total} bài học`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['course', courseId] });
      setVideoCurrentStep('');
    },
    onError: (err: any) => {
      enqueueSnackbar(`Lỗi sinh video hàng loạt: ${err.message}`, { variant: 'error' });
      setVideoCurrentStep('');
    }
  });

  const handleGenerateLessonImage = (lessonOrder: number) => {
    setGeneratingLesson(lessonOrder);
    generateLessonImageMut.mutate(lessonOrder);
  };

  const handleGenerateLessonVideo = (lessonOrder: number) => {
    setGeneratingVideoLesson(lessonOrder);
    generateLessonVideoMut.mutate(lessonOrder);
  };

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

  return (
    <>
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
        <Button variant="contained" startIcon={<Edit />} onClick={() => navigate(`/admin/courses/${courseId}/edit`)}>
          Chỉnh sửa
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
        <Button
          variant="contained" color="secondary" startIcon={<MovieFilter />}
          onClick={() => generateAllVideosMut.mutate()} disabled={generateAllVideosMut.isPending}
        >
          Sinh video toàn bộ học phần
        </Button>
      </Box>

      {/* Generation Progress Progress */}
      {videoCurrentStep && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<AutoAwesome />}>
          <Typography variant="subtitle2" fontWeight={600}>{videoCurrentStep}</Typography>
          <LinearProgress sx={{ my: 1, height: 8, borderRadius: 4 }} />
          {videoProgressLog.length > 0 && (
            <Box sx={{
              maxHeight: 120, overflowY: 'auto', mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.5)',
              borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem'
            }}>
              {videoProgressLog.map((log, i) => <div key={i}>{log}</div>)}
            </Box>
          )}
        </Alert>
      )}

      {/* Nguồn tài liệu tạo ra khóa học */}
      {(course.source_document_ids?.length ?? 0) > 0 && (
        <SourceDocumentsCard docIds={course.source_document_ids!} aiModel={course.ai_model} aiAt={course.ai_generated_at} />
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
      {(course.lessons?.length ?? 0) > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Danh sách bài học ({course.lessons!.length})
          </Typography>
          {course.lessons!.map((lesson) => (
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
                    {/* AI Multimedia Generation Buttons */}
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        startIcon={<AutoAwesome />}
                        disabled={generatingLesson === lesson.order}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateLessonImage(lesson.order);
                        }}
                        sx={{ fontSize: '0.7rem', py: 0 }}
                      >
                        {generatingLesson === lesson.order ? 'Đang sinh...' : 'Sinh ảnh'}
                      </Button>
                      <Button
                        size="small"
                        color="secondary"
                        startIcon={<AutoAwesome />}
                        disabled={generatingVideoLesson === lesson.order}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateLessonVideo(lesson.order);
                        }}
                        sx={{ fontSize: '0.7rem', py: 0 }}
                      >
                        {generatingVideoLesson === lesson.order ? 'Đang sinh...' : 'Sinh video'}
                      </Button>
                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 16, alignSelf: 'center' }} />

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
                  </Stack>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2.5, pb: 3, px: 3 }}>
                {/* Ảnh minh họa (read-only) */}
                {lesson.image_url && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      component="img"
                      src={imageUrl(lesson.image_url)}
                      alt={lesson.title}
                      sx={{
                        width: 160, height: 160,
                        objectFit: 'cover', borderRadius: 2,
                        border: '1px solid', borderColor: 'divider',
                        cursor: 'pointer', '&:hover': { opacity: 0.85 },
                      }}
                      onClick={() => window.open(imageUrl(lesson.image_url!), '_blank')}
                    />
                  </Box>
                )}

                {/* Video minh họa (read-only) */}
                {lesson.video_url && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      component="video"
                      src={lesson.video_url}
                      controls
                      sx={{
                        width: 280, height: 160,
                        objectFit: 'cover', borderRadius: 2,
                        border: '1px solid', borderColor: 'divider',
                      }}
                    />
                  </Box>
                )}

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
      )}

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
    </>
  );
}
function SourceDocumentsCard({
  docIds, aiModel, aiAt,
}: { docIds: string[]; aiModel?: string | null; aiAt?: string | null }) {
  const queries = docIds.map((id) => ({
    id, q: useQuery({
      queryKey: ['doc-info', id],
      queryFn: () => import('@/api/documentApi').then((m) => m.documentApi.get(id)),
    })
  }));
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <AutoAwesome fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>Tài liệu nguồn</Typography>
          {aiModel && <Chip size="small" label={`AI: ${aiModel}`} variant="outlined" />}
          {aiAt && <Chip size="small" label={`Sinh ngày ${formatDateTime(aiAt)}`} variant="outlined" />}
        </Stack>
        <Stack spacing={1}>
          {queries.map(({ id, q }) => {
            const d = q.data;
            return (
              <Paper key={id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ImageIcon fontSize="small" color="action" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {q.isLoading ? 'Đang tải…' : d?.title || '(Không tìm thấy)'}
                  </Typography>
                  {d && (
                    <Typography variant="caption" color="text.secondary">
                      {d.file_name} · {d.status}
                    </Typography>
                  )}
                </Box>
                {d && (
                  <Button size="small" variant="outlined"
                    onClick={() => window.open(`/admin/documents/${d.id}`, '_blank')}>
                    Xem tài liệu
                  </Button>
                )}
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
