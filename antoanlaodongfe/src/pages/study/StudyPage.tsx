import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Button, Paper,
  Chip, Stack, Divider, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails, Alert, Skeleton,
  Tooltip, List, ListItem, ListItemIcon, ListItemText,
  Select, MenuItem, FormControl, InputLabel, LinearProgress
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  MenuBook, Description, SmartToy, ExpandMore,
  AccessTime, Download, Quiz, School, Star, StarOutline, CheckCircle
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AITutorPage from '@/pages/AITutorPage';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { studyApi } from '@/api/studyApi';
import { courseApi, type CourseResponse } from '@/api/courseApi';
import { documentApi } from '@/api/documentApi';
import { lessonProgressApi } from '@/api/lessonProgressApi';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';
import type { ApprovalStatus } from '@/types/enums';

export default function StudyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [expandedCourse, setExpandedCourse] = useState<string | false>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch study materials (courses + documents matched to user profile)
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['study-materials', user?.occupation, user?.skill_level],
    queryFn: () => studyApi.getMaterials({ occupation: user?.occupation, skill_level: user?.skill_level }),
    enabled: !!user,
  });

  // Fetch all approved courses (in case study materials API returns empty)
  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-approved'],
    queryFn: () => courseApi.list({ status: 'approved' as const, page: 1, page_size: 50 }),
  });

  // Fetch all approved documents (in case study materials API returns empty)
  const { data: allDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ['documents-approved'],
    queryFn: () => documentApi.list({ status: 'approved' as ApprovalStatus, page: 1, page_size: 50 }),
  });

  // Fetch user's course progress summaries
  const { data: summaries = [] } = useQuery({
    queryKey: ['my-course-summaries'],
    queryFn: () => lessonProgressApi.mySummaries(),
    enabled: !!user,
  });

  const summaryMap = useMemo(
    () => Object.fromEntries(summaries.map((s: any) => [s.course_id, s])),
    [summaries],
  );

  // Fetch course detail when expanded
  const [courseDetail, setCourseDetail] = useState<Record<string, CourseResponse>>({});
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);

  const handleExpandCourse = async (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(false);
      return;
    }
    setExpandedCourse(courseId);
    if (!courseDetail[courseId]) {
      setLoadingCourseId(courseId);
      try {
        const detail = await courseApi.get(courseId);
        setCourseDetail((prev) => ({ ...prev, [courseId]: detail }));
      } catch { /* ignore */ }
      setLoadingCourseId(null);
    }
  };

  // Logic to determine course status
  const getCourseStatus = (courseId: string) => {
    const sum = summaryMap[courseId];
    if (sum?.is_course_complete) return 'completed';
    if (sum && sum.percent > 0) return 'in_progress';
    return 'not_started';
  };

  // Merge materials courses with all approved courses
  const materialCourseIds = new Set(materials?.courses?.map((c) => c.id) || []);
  const extraCoursesList = allCourses?.items?.filter((c) => !materialCourseIds.has(c.id)) || [];

  // Apply filters
  const filteredMaterialsCourses = (materials?.courses || [])
    .filter(c => statusFilter === 'all' || getCourseStatus(c.id) === statusFilter)
    .sort((a, b) => (b.is_mandatory ? 1 : 0) - (a.is_mandatory ? 1 : 0));

  const filteredExtraCourses = extraCoursesList
    .filter(c => statusFilter === 'all' || getCourseStatus(c.id) === statusFilter)
    .sort((a, b) => (b.is_mandatory ? 1 : 0) - (a.is_mandatory ? 1 : 0));

  const hasCourses = filteredMaterialsCourses.length > 0 || filteredExtraCourses.length > 0;

  // Merge materials documents with all approved documents
  const materialDocIds = new Set(materials?.documents?.map((d) => d.id) || []);
  const extraDocuments = allDocuments?.items?.filter((d) => !materialDocIds.has(d.id)) || [];
  const hasDocuments = (materials?.documents?.length || 0) > 0 || extraDocuments.length > 0;

  return (
    <>
      <PageHeader title="Học tập & Ôn luyện" subtitle="Tài liệu, khóa học và hỏi đáp AI gia sư" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<MenuBook />} iconPosition="start" label="Khóa học" />
        <Tab icon={<Description />} iconPosition="start" label="Tài liệu" />
        <Tab icon={<SmartToy />} iconPosition="start" label="AI Gia sư" />
      </Tabs>

      {/* Tab 0: Courses */}
      {tab === 0 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'background.paper' }}>
              <InputLabel>Trạng thái học</InputLabel>
              <Select
                value={statusFilter}
                label="Trạng thái học"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="completed">Đã học xong</MenuItem>
                <MenuItem value="in_progress">Đang học</MenuItem>
                <MenuItem value="not_started">Chưa học</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {materialsLoading || coursesLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="80%" /></CardContent></Card>
              ))}
            </Stack>
          ) : !hasCourses ? (
            <EmptyState message="Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại" />
          ) : (
            <Stack spacing={2}>
              {/* User-matched courses first */}
              {filteredMaterialsCourses.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>
                    Khóa học phù hợp với bạn
                  </Typography>
                  {filteredMaterialsCourses.map((c) => {
                    const sum = summaryMap[c.id];
                    return (
                      <CourseCard
                        key={c.id}
                        id={c.id}
                        title={c.title}
                        description={c.description}
                        occupation={c.occupation}
                        skillLevel={c.skill_level}
                        trainingGroup={c.training_group}
                        lessonCount={c.lesson_count}
                        expanded={expandedCourse === c.id}
                        detail={courseDetail[c.id]}
                        loading={loadingCourseId === c.id}
                        onToggle={() => handleExpandCourse(c.id)}
                        isMandatory={c.is_mandatory}
                        percent={sum?.percent || 0}
                        isCompleted={sum?.is_course_complete}
                        highlighted
                      />
                    );
                  })}
                </>
              )}

              {/* Other approved courses */}
              {filteredExtraCourses.length > 0 && (
                <>
                  {filteredMaterialsCourses.length > 0 && (
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mt: 2 }}>
                      Tất cả khóa học
                    </Typography>
                  )}
                  {filteredExtraCourses.map((c) => {
                    const sum = summaryMap[c.id];
                    return (
                      <CourseCard
                        key={c.id}
                        id={c.id}
                        title={c.title}
                        description={c.description}
                        occupation={c.occupation}
                        skillLevel={c.skill_level}
                        trainingGroup={c.training_group}
                        lessonCount={c.lesson_count ?? c.lessons?.length ?? 0}
                        expanded={expandedCourse === c.id}
                        detail={courseDetail[c.id] || (c.lessons?.length ? c : undefined)}
                        loading={loadingCourseId === c.id}
                        onToggle={() => handleExpandCourse(c.id)}
                        isMandatory={c.is_mandatory}
                        percent={sum?.percent || 0}
                        isCompleted={sum?.is_course_complete}
                      />
                    );
                  })}
                </>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* Tab 1: Documents */}
      {tab === 1 && (
        <Box>
          {materialsLoading || docsLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent><Skeleton variant="text" width="60%" height={28} /><Skeleton variant="text" width="40%" /></CardContent></Card>
              ))}
            </Stack>
          ) : !hasDocuments ? (
            <EmptyState message="Chưa có tài liệu tham khảo nào" />
          ) : (
            <Stack spacing={2}>
              {/* User-matched documents */}
              {materials?.documents && materials.documents.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>
                    Tài liệu phù hợp với bạn
                  </Typography>
                  <Grid container spacing={2}>
                    {materials.documents.map((d) => (
                      <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <DocumentCard id={d.id} title={d.title} description={d.description} fileName={d.file_name} documentType={d.document_type} highlighted />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* All approved documents */}
              {extraDocuments.length > 0 && (
                <>
                  {materials?.documents && materials.documents.length > 0 && (
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mt: 2 }}>
                      Tất cả tài liệu
                    </Typography>
                  )}
                  <Grid container spacing={2}>
                    {extraDocuments.map((d) => (
                      <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <DocumentCard id={d.id} title={d.title} description={d.description} fileName={d.file_name} documentType={d.document_type} />
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* Tab 2: AI Tutor */}
      {tab === 2 && (
        <AITutorPage hideHeader />
      )}
    </>
  );
}

/* ─── Document Card Component ─── */

const docTypeLabels: Record<string, string> = {
  company_internal: 'Nội bộ công ty',
  safety_procedure: 'Quy trình an toàn',
  legal_document: 'Văn bản pháp luật',
  question_bank: 'Ngân hàng câu hỏi',
};

interface DocumentCardProps {
  id: string;
  title: string;
  description: string;
  fileName: string;
  documentType: string;
  highlighted?: boolean;
}

function DocumentCard({ id, title, description, fileName, documentType, highlighted }: DocumentCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');

  return (
    <Card
      sx={{
        height: '100%',
        border: highlighted ? '1px solid' : undefined,
        borderColor: highlighted ? 'primary.200' : undefined,
        bgcolor: highlighted ? 'primary.50' : undefined,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Description color="secondary" sx={{ mt: 0.3 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {description}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip label={docTypeLabels[documentType] || documentType} size="small" color="primary" variant="outlined" />
              <Chip label={fileName} size="small" variant="outlined" />
            </Stack>
            <Stack direction="row" spacing={1}>
              {isPdf && (
                <Button
                  size="small"
                  variant={showPreview ? 'contained' : 'outlined'}
                  startIcon={<MenuBook />}
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'Ẩn' : 'Xem trước'}
                </Button>
              )}
              <Tooltip title="Tải xuống">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Download />}
                  href={documentApi.downloadUrl(id)}
                  target="_blank"
                >
                  Tải xuống
                </Button>
              </Tooltip>
            </Stack>
          </Box>
        </Box>

        {/* Inline PDF preview */}
        {showPreview && isPdf && (
          <Box
            component="iframe"
            src={`${documentApi.previewUrl(id)}#toolbar=1&navpanes=1`}
            sx={{
              width: '100%',
              height: 500,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mt: 2,
              display: 'block',
            }}
            title={`Xem trước: ${title}`}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Course Card Component ─── */

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  occupation: string;
  skillLevel: number;
  trainingGroup: string;
  lessonCount: number;
  expanded: boolean;
  detail?: CourseResponse;
  loading: boolean;
  onToggle: () => void;
  highlighted?: boolean;
  isMandatory?: boolean;
  percent?: number;
  isCompleted?: boolean;
}

function CourseCard({
  id, title, description, occupation, skillLevel, trainingGroup,
  lessonCount, expanded, detail, loading, onToggle, highlighted,
  isMandatory, percent = 0, isCompleted
}: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        border: highlighted ? '1px solid' : undefined,
        borderColor: highlighted ? 'primary.200' : undefined,
        bgcolor: isCompleted ? '#edf7ed' : (highlighted ? 'primary.50' : 'background.paper'), // Thay đổi màu nền khi hoàn thành
        transition: 'background-color 0.3s',
      }}
    >
      <CardContent sx={{ pb: '8px !important' }}>
        {/* Header - clickable */}
        <Box
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
          onClick={onToggle}
        >
          {/* Cột đầu: Dấu sao đánh dấu bắt buộc */}
          <Box sx={{ mt: 0.3, minWidth: 28, display: 'flex', justifyContent: 'center' }} title={isMandatory ? "Khóa học bắt buộc" : ""}>
            {isMandatory ? (
              <Star sx={{ color: '#fbc02d', fontSize: 28 }} />
            ) : (
              <StarOutline sx={{ color: 'action.disabled', fontSize: 28 }} />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="body1" fontWeight={600}>
                {title}
              </Typography>
              {isCompleted && (
                <Chip size="small" label="Hoàn thành" color="success" icon={<CheckCircle fontSize="small" />} sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>

            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {isMandatory && (
                <Chip icon={<Star />} label="Bắt buộc" size="small" color="warning" sx={{ fontWeight: 600 }} />
              )}
              <Chip label={occupation} size="small" variant="outlined" />
              {skillLevel > 0 && <Chip label={`Bậc ${skillLevel}`} size="small" variant="outlined" />}
              <Chip
                label={trainingGroupLabels[trainingGroup as keyof typeof trainingGroupLabels] || trainingGroup}
                size="small" color="primary" variant="outlined"
              />
              <Chip icon={<Quiz />} label={`${lessonCount} bài học`} size="small" />
            </Stack>

            {/* Thanh tiến độ học thuật */}
            <Box sx={{ mt: 2, maxWidth: 300 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Tiến độ khóa học</Typography>
                <Typography variant="caption" color={isCompleted ? "success.main" : "text.secondary"} fontWeight={600}>{percent}%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={percent}
                color={isCompleted ? 'success' : 'primary'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          </Box>
          <ExpandMore sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s', mt: 0.5 }} />
        </Box>

        {/* Actions */}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant={isCompleted ? "outlined" : "contained"}
            color="primary"
            startIcon={<School />}
            onClick={() => navigate(`/study/courses/${id}`)}
          >
            {percent > 0 && !isCompleted ? "Tiếp tục học" : (isCompleted ? "Xem lại" : "Học ngay")}
          </Button>
        </Box>

        {/* Expanded lessons */}
        {expanded && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Stack spacing={1}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            ) : detail?.lessons && detail.lessons.length > 0 ? (
              <Stack spacing={0}>
                {detail.objectives && detail.objectives.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mục tiêu khóa học</Typography>
                    <List dense disablePadding>
                      {detail.objectives.map((obj, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <Typography variant="body2" color="primary">•</Typography>
                          </ListItemIcon>
                          <ListItemText primary={obj} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Danh sách bài học</Typography>
                {detail.lessons.map((lesson) => (
                  <Accordion
                    key={lesson.order}
                    disableGutters
                    elevation={0}
                    sx={{ border: '1px solid', borderColor: 'divider', '&:not(:last-child)': { borderBottom: 0 }, '&::before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Chip label={lesson.order} size="small" color="primary" sx={{ fontWeight: 700, minWidth: 28 }} />
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{lesson.title}</Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 1 }}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">{lesson.duration_minutes} phút</Typography>
                        </Stack>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 2 }}>
                      {lesson.image_url && (
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                          <Box
                            component="img"
                            src={lesson.image_url}
                            alt={lesson.title}
                            sx={{
                              maxWidth: '100%',
                              maxHeight: 300,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              objectFit: 'contain',
                            }}
                          />
                        </Box>
                      )}
                      {lesson.video_url && (
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                          <Box
                            component="video"
                            src={lesson.video_url}
                            controls
                            sx={{
                              maxWidth: '100%',
                              maxHeight: 360,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        </Box>
                      )}
                      {lesson.theory && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary.main" gutterBottom>Lý thuyết</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                            {lesson.theory}
                          </Typography>
                        </Box>
                      )}
                      {lesson.scenario && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="warning.main" gutterBottom>Tình huống thực tế</Typography>
                          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'warning.50' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                              {lesson.scenario}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                      {lesson.safety_notes && (
                        <Alert severity="error" icon={false} sx={{ mt: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>Lưu ý an toàn</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {lesson.safety_notes}
                          </Typography>
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
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Chưa có nội dung bài học.
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}