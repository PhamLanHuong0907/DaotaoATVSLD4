import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, Avatar, Chip,
  Divider, Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Person, Lock, Save } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import PageHeader from '@/components/common/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/authApi';
import { userRoleLabels } from '@/utils/vietnameseLabels';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Hydrate profile fields from /auth/me on mount
  useEffect(() => {
    authApi.me().then((me) => {
      setFullName(me.full_name);
      setPhone(me.phone || '');
      setEmail(me.email || '');
    }).catch(() => {});
  }, []);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        email: email || undefined,
      });
      setUser({ ...user, full_name: updated.full_name });
      enqueueSnackbar('Đã cập nhật hồ sơ', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      enqueueSnackbar('Mật khẩu xác nhận không khớp', { variant: 'warning' });
      return;
    }
    if (newPwd.length < 6) {
      enqueueSnackbar('Mật khẩu mới phải dài ít nhất 6 ký tự', { variant: 'warning' });
      return;
    }
    setSavingPwd(true);
    try {
      await authApi.changePassword(oldPwd, newPwd);
      enqueueSnackbar('Đã đổi mật khẩu', { variant: 'success' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" subtitle="Quản lý thông tin tài khoản và đổi mật khẩu" />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 96, height: 96, mx: 'auto', mb: 2,
                  bgcolor: 'primary.main', fontSize: 32,
                }}
              >
                {user.full_name.charAt(0)}
              </Avatar>
              <Typography variant="h6">{user.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.username}</Typography>
              <Chip
                label={userRoleLabels[user.role] || user.role}
                color="primary" size="small" sx={{ mt: 1 }}
              />
              <Divider sx={{ my: 2 }} />
              <Stack spacing={0.5} alignItems="flex-start">
                <Typography variant="caption" color="text.secondary">Mã nhân viên</Typography>
                <Typography variant="body2">{user.employee_id}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Nghề</Typography>
                <Typography variant="body2">{user.occupation || '—'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Bậc tay nghề</Typography>
                <Typography variant="body2">{user.skill_level || '—'}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Person color="primary" />
                <Typography variant="h6">Thông tin cá nhân</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField fullWidth label="Họ và tên" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
                <TextField fullWidth label="Số điện thoại" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
                <TextField fullWidth type="email" label="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained" startIcon={<Save />}
                    disabled={savingProfile} onClick={handleSaveProfile}
                  >
                    Lưu thông tin
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Lock color="primary" />
                <Typography variant="h6">Đổi mật khẩu</Typography>
              </Stack>
              <Alert severity="info" sx={{ mb: 2 }}>
                Mật khẩu mới phải dài ít nhất 6 ký tự.
              </Alert>
              <Stack spacing={2}>
                <TextField fullWidth type="password" label="Mật khẩu hiện tại"
                  value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                <TextField fullWidth type="password" label="Mật khẩu mới"
                  value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <TextField fullWidth type="password" label="Xác nhận mật khẩu mới"
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained" color="warning" startIcon={<Lock />}
                    disabled={savingPwd || !oldPwd || !newPwd} onClick={handleChangePassword}
                  >
                    Đổi mật khẩu
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
