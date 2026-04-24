import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardActionArea, CardContent, Chip, Stack, Typography, Paper, Tabs, Tab,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { School, MenuBook, Star, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { courseApi } from '@/api/courseApi';
import { lessonProgressApi } from '@/api/lessonProgressApi';
import { trainingGroupLabels } from '@/utils/vietnameseLabels';

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const onlyMandatory = tab === 1;

  const { data = [], isLoading } = useQuery({
    queryKey: ['my-courses', onlyMandatory],
    queryFn: () => courseApi.myCourses(onlyMandatory),
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ['my-course-summaries'],
    queryFn: () => lessonProgressApi.mySummaries(),
  });

  const summaryMap = useMemo(
    () => Object.fromEntries(summaries.map((s) => [s.course_id, s])),
    [summaries],
  );

  return (
    <>
      <PageHeader
        title="Khóa học"
        subtitle="Các khóa học được giao. Khóa có dấu * (đỏ) là bắt buộc phải hoàn thành."
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Tất cả" />
        <Tab label="Bắt buộc" icon={<Star fontSize="small" />} iconPosition="end" />
      </Tabs>

      {isLoading ? (
        <Paper sx={{ p: 4 }}><Typography>Đang tải...</Typography></Paper>
      ) : data.length === 0 ? (
        <EmptyState message="Hiện chưa có khóa học nào được giao cho bạn" />
      ) : (
        <Grid container spacing={2}>
          {data.map((c) => {
            const sum = summaryMap[c.id];
            const percent = sum?.percent ?? 0;
            const completed = sum?.is_course_complete;
            return (
              <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea
                    sx={{ height: '100%' }}
                    onClick={() => navigate(`/study/courses/${c.id}`)}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <School color="primary" />
                        <Stack direction="row" spacing={0.5}>
                          {completed && (
                            <Chip size="small" label="Hoàn thành" color="success" icon={<CheckCircle />} />
                          )}
                          {c.is_mandatory && (
                            <Chip size="small" label="Bắt buộc" color="warning" icon={<Star />} />
                          )}
                        </Stack>
                      </Stack>
                      <Typography variant="h6" gutterBottom>
                        {c.title}
                        {c.is_mandatory && (
                          <Box component="span" sx={{
                            ml: 0.5, color: '#c62828',
                            fontWeight: 700, fontSize: '1.25em', verticalAlign: 'top',
                          }} title="Khóa học bắt buộc">
                            *
                          </Box>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {trainingGroupLabels[c.training_group]}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Chip size="small" variant="outlined" label={c.occupation} />
                        <Chip size="small" variant="outlined" label={`Bậc ${c.skill_level}`} />
                      </Stack>
                      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MenuBook fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {sum ? `${sum.completed}/${sum.total_lessons}` : c.lesson_count} bài học
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Tiến độ</Typography>
                          <Typography variant="caption" color="text.secondary">{percent}%</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          color={completed ? 'success' : 'primary'}
                          sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
