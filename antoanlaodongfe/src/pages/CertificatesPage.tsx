import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Chip, Stack, Typography, Paper, Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Verified, EmojiEvents, Download } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { certificateApi } from '@/api/certificateApi';
import { classificationLabels, examTypeLabels } from '@/utils/vietnameseLabels';

const classificationColor: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  excellent: 'success',
  good: 'info',
  average: 'warning',
  fail: 'default',
};

export default function CertificatesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => certificateApi.myCertificates(),
  });

  const handleDownload = async (id: string, code: string) => {
    try {
      const blob = await certificateApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chung-chi-${code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    }
  };

  return (
    <>
      <PageHeader title="Chứng chỉ của tôi" subtitle="Các chứng chỉ ATVSLĐ đã được cấp" />

      {isLoading ? (
        <Paper sx={{ p: 4 }}><Typography>Đang tải...</Typography></Paper>
      ) : certs.length === 0 ? (
        <EmptyState message="Bạn chưa có chứng chỉ nào. Hãy hoàn thành các kỳ thi để được cấp chứng chỉ." />
      ) : (
        <Grid container spacing={2}>
          {certs.map((c) => (
            <Grid key={c.id} size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ borderColor: c.revoked ? 'error.light' : 'success.light' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <EmojiEvents sx={{ fontSize: 36, color: c.revoked ? 'error.main' : 'warning.main' }} />
                      <Box>
                        <Typography variant="h6">{c.exam_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {examTypeLabels[c.exam_type]}
                        </Typography>
                      </Box>
                    </Box>
                    {c.revoked ? (
                      <Chip label="Đã huỷ" color="error" size="small" />
                    ) : (
                      <Chip
                        label={classificationLabels[c.classification]}
                        color={classificationColor[c.classification]}
                        size="small"
                      />
                    )}
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Mã chứng chỉ</Typography>
                    <Typography variant="body1" fontFamily="monospace" fontWeight={600}>
                      {c.code}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Điểm</Typography>
                      <Typography variant="h6">{c.score}/10</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Cấp ngày</Typography>
                      <Typography variant="body2">{dayjs(c.issued_at).format('DD/MM/YYYY')}</Typography>
                    </Box>
                    {c.valid_until && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Có hiệu lực đến</Typography>
                        <Typography variant="body2">{dayjs(c.valid_until).format('DD/MM/YYYY')}</Typography>
                      </Box>
                    )}
                  </Stack>

                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Verified fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">
                      Xác thực tại: /api/v1/certificates/verify/{c.code}
                    </Typography>
                  </Box>

                  {!c.revoked && (
                    <Button
                      fullWidth variant="outlined" startIcon={<Download />} sx={{ mt: 2 }}
                      onClick={() => handleDownload(c.id, c.code)}
                    >
                      Tải PDF chứng chỉ
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
