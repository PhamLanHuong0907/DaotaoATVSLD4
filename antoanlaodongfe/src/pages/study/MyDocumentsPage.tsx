import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardActionArea, CardContent, Chip, Stack, Typography, Paper, Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Description, Download } from '@mui/icons-material';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { documentApi } from '@/api/documentApi';

const docTypeLabels: Record<string, string> = {
  company_internal: 'Tài liệu nội bộ',
  safety_procedure: 'Quy trình an toàn',
  legal_document: 'Văn bản pháp luật',
  question_bank: 'Ngân hàng câu hỏi',
};

export default function MyDocumentsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => documentApi.myDocuments(),
  });

  return (
    <>
      <PageHeader
        title="Tài liệu học tập"
        subtitle="Tài liệu được giao cho phòng ban / nghề / bậc của bạn"
      />

      {isLoading ? (
        <Paper sx={{ p: 4 }}><Typography>Đang tải...</Typography></Paper>
      ) : data.length === 0 ? (
        <EmptyState message="Chưa có tài liệu nào được giao cho bạn" />
      ) : (
        <Grid container spacing={2}>
          {data.map((d) => (
            <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea
                  sx={{ flexGrow: 1 }}
                  component="a"
                  href={documentApi.previewUrl(d.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Description color="primary" />
                      <Chip
                        size="small"
                        label={docTypeLabels[d.document_type] || d.document_type}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {d.title}
                    </Typography>
                    {d.description && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {d.description}
                      </Typography>
                    )}
                    {d.occupations?.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                        {d.occupations.slice(0, 3).map((o) => (
                          <Chip key={o} size="small" label={o} variant="outlined" />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </CardActionArea>
                <Box sx={{ p: 1.5, pt: 0 }}>
                  <Button
                    fullWidth size="small" startIcon={<Download />}
                    component="a" href={documentApi.downloadUrl(d.id)}
                  >
                    Tải xuống
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
