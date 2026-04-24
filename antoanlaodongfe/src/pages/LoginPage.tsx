import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert,
  Container, Avatar, Tabs, Tab, FormControlLabel, Checkbox,
} from '@mui/material';
import { Security as SafetyIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState(0);

  // login state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin@123');
  const [rememberMe, setRememberMe] = useState(true);

  // register state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regOccupation, setRegOccupation] = useState('');
  const [regSkillLevel, setRegSkillLevel] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password, rememberMe);
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await register({
        username: regUsername.trim(),
        password: regPassword,
        full_name: regFullName,
        employee_id: regEmployeeId,
        occupation: regOccupation,
        skill_level: regSkillLevel,
      });
    } catch (e: any) {
      setError(e?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar sx={{ mx: 'auto', bgcolor: 'primary.main', width: 64, height: 64 }}>
            <SafetyIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 2 }}>
            Hệ thống huấn luyện ATVSLĐ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Công ty than Dương Huy
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(null); }} centered sx={{ mb: 2 }}>
              <Tab label="Đăng nhập" />
              <Tab label="Đăng ký" />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {tab === 0 && (
              <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                <TextField
                  fullWidth label="Tên đăng nhập" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  sx={{ mb: 2 }} autoFocus
                />
                <TextField
                  fullWidth type="password" label="Mật khẩu" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label="Ghi nhớ đăng nhập"
                  sx={{ mb: 1 }}
                />
                <Button
                  type="submit" fullWidth variant="contained" size="large"
                  disabled={loading || !username || !password}
                >
                  Đăng nhập
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                  Mặc định: admin / admin@123
                </Typography>
              </Box>
            )}

            {tab === 1 && (
              <Box component="form" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                <TextField fullWidth label="Tên đăng nhập" value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth type="password" label="Mật khẩu" value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Họ và tên" value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Mã nhân viên" value={regEmployeeId}
                  onChange={(e) => setRegEmployeeId(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Nghề / chức danh" value={regOccupation}
                  onChange={(e) => setRegOccupation(e.target.value)} sx={{ mb: 2 }} />
                <TextField
                  fullWidth type="number" label="Bậc tay nghề (1-7)"
                  value={regSkillLevel}
                  onChange={(e) => setRegSkillLevel(Number(e.target.value) || 1)}
                  slotProps={{ htmlInput: { min: 1, max: 7 } }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit" fullWidth variant="contained" size="large"
                  disabled={loading || !regUsername || !regPassword || !regFullName || !regEmployeeId}
                >
                  Đăng ký
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
