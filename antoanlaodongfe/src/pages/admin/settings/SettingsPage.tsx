import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack,
  FormControlLabel, Switch, Divider, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save, Business, EmojiEvents, Settings as SettingsIcon, Image as ImageIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import { settingsApi, type SystemSettingsUpdate } from '@/api/settingsApi';

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.get(),
  });

  const [form, setForm] = useState<SystemSettingsUpdate>({});

  useEffect(() => {
    if (data) {
      setForm({
        company_name: data.company_name,
        company_address: data.company_address || '',
        company_phone: data.company_phone || '',
        logo_url: data.logo_url || '',
        certificate_validity_months: data.certificate_validity_months,
        certificate_signer_name: data.certificate_signer_name || '',
        certificate_signer_title: data.certificate_signer_title || '',
        default_passing_score: data.default_passing_score,
        allow_self_register: data.allow_self_register,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: SystemSettingsUpdate) => settingsApi.update(payload),
    onSuccess: () => {
      enqueueSnackbar('Đã lưu cấu hình hệ thống', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: (updated) => {
      enqueueSnackbar('Đã cập nhật logo', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      setForm((prev) => ({ ...prev, logo_url: updated.logo_url || '' }));
    },
    onError: (e: Error) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
    e.target.value = '';
  };

  if (isLoading || !data) return <Typography>Đang tải...</Typography>;

  return (
    <>
      <PageHeader title="Cấu hình hệ thống" subtitle="Thông tin doanh nghiệp, chứng chỉ, chính sách thi" />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Business color="primary" />
                <Typography variant="h6">Thông tin doanh nghiệp</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField fullWidth label="Tên công ty" value={form.company_name || ''}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                <TextField fullWidth label="Địa chỉ" value={form.company_address || ''}
                  onChange={(e) => setForm({ ...form, company_address: e.target.value })} />
                <TextField fullWidth label="Số điện thoại" value={form.company_phone || ''}
                  onChange={(e) => setForm({ ...form, company_phone: e.target.value })} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Logo công ty
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={form.logo_url || undefined}
                      variant="rounded"
                      sx={{ width: 80, height: 80, bgcolor: 'grey.100', color: 'grey.500' }}
                    >
                      <ImageIcon />
                    </Avatar>
                    <Stack spacing={1}>
                      <Button
                        variant="outlined" component="label"
                        disabled={uploadLogo.isPending}
                      >
                        {uploadLogo.isPending ? 'Đang tải...' : 'Tải logo lên'}
                        <input
                          type="file" hidden ref={logoInputRef}
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoChange}
                        />
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        PNG, JPG, WEBP, SVG. Sẽ hiển thị trên chứng chỉ và header.
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <EmojiEvents color="primary" />
                <Typography variant="h6">Chứng chỉ</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  fullWidth type="number" label="Hiệu lực (tháng)"
                  value={form.certificate_validity_months || 12}
                  onChange={(e) => setForm({ ...form, certificate_validity_months: Number(e.target.value) })}
                  slotProps={{ htmlInput: { min: 1, max: 120 } }}
                />
                <TextField fullWidth label="Người ký chứng chỉ"
                  value={form.certificate_signer_name || ''}
                  onChange={(e) => setForm({ ...form, certificate_signer_name: e.target.value })} />
                <TextField fullWidth label="Chức vụ người ký"
                  value={form.certificate_signer_title || ''}
                  onChange={(e) => setForm({ ...form, certificate_signer_title: e.target.value })} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Chính sách thi & đăng ký</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  type="number" label="Điểm đạt mặc định" sx={{ maxWidth: 200 }}
                  value={form.default_passing_score || 5}
                  onChange={(e) => setForm({ ...form, default_passing_score: Number(e.target.value) })}
                  slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.allow_self_register}
                      onChange={(e) => setForm({ ...form, allow_self_register: e.target.checked })}
                    />
                  }
                  label="Cho phép người lao động tự đăng ký tài khoản"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained" size="large" startIcon={<Save />}
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
        >
          Lưu tất cả cấu hình
        </Button>
      </Box>
    </>
  );
}
