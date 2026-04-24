import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  TextField,
  Button,
  Container,
  Avatar,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  School as OfficerIcon,
  Engineering as WorkerIcon,
  Security as SafetyIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/enums';

interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultUser: {
    id: string;
    username: string;
    full_name: string;
    employee_id: string;
    occupation: string;
    skill_level: number;
  };
}

const roleOptions: RoleOption[] = [
  {
    role: 'training_officer',
    label: 'Cán bộ đào tạo',
    description: 'Quản lý tài liệu, khóa học, ngân hàng câu hỏi, tổ chức kỳ thi, xem báo cáo',
    icon: <OfficerIcon sx={{ fontSize: 48 }} />,
    color: '#1565c0',
    defaultUser: {
      id: 'officer_001',
      username: 'officer',
      full_name: 'Trần Văn B',
      employee_id: 'CB001',
      occupation: 'Cán bộ đào tạo ATVSLĐ',
      skill_level: 0,
    },
  },
  {
    role: 'worker',
    label: 'Người lao động',
    description: 'Thi trực tuyến, xem kết quả, học tập ôn luyện, chat với AI gia sư',
    icon: <WorkerIcon sx={{ fontSize: 48 }} />,
    color: '#f57c00',
    defaultUser: {
      id: 'user_001',
      username: 'worker',
      full_name: 'Nguyễn Văn A',
      employee_id: 'NV001',
      occupation: 'Thợ khai thác lò',
      skill_level: 3,
    },
  },
  {
    role: 'manager',
    label: 'Cán bộ quản lý',
    description: 'Xem báo cáo, thống kê kết quả huấn luyện theo đơn vị',
    icon: <SafetyIcon sx={{ fontSize: 48 }} />,
    color: '#2e7d32',
    defaultUser: {
      id: 'manager_001',
      username: 'manager',
      full_name: 'Lê Văn C',
      employee_id: 'QL001',
      occupation: 'Quản đốc phân xưởng',
      skill_level: 0,
    },
  },
];

export default function RoleSelectPage() {
  const { setUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [fullName, setFullName] = useState('');

  const handleSelectRole = (option: RoleOption) => {
    setSelectedRole(option);
    setFullName(option.defaultUser.full_name);
  };

  const handleConfirm = () => {
    if (!selectedRole) return;
    setUser({
      ...selectedRole.defaultUser,
      full_name: fullName || selectedRole.defaultUser.full_name,
      role: selectedRole.role,
    });
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
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <SafetyIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
            Hệ thống huấn luyện ATVSLĐ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            An toàn vệ sinh lao động — Vui lòng chọn vai trò của bạn để tiếp tục
          </Typography>
        </Box>

        {/* Role Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {roleOptions.map((option) => {
            const isSelected = selectedRole?.role === option.role;
            return (
              <Grid key={option.role} size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    border: 2,
                    borderColor: isSelected ? option.color : 'transparent',
                    boxShadow: isSelected ? 4 : 1,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                  }}
                >
                  <CardActionArea onClick={() => handleSelectRole(option)} sx={{ height: '100%' }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          mx: 'auto',
                          mb: 2,
                          bgcolor: isSelected ? option.color : 'grey.100',
                          color: isSelected ? 'white' : option.color,
                          transition: 'all 0.2s',
                        }}
                      >
                        {option.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {option.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48 }}>
                        {option.description}
                      </Typography>
                      {isSelected && (
                        <Chip label="Đã chọn" color="primary" size="small" sx={{ mt: 1.5 }} />
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Name Input & Confirm */}
        {selectedRole && (
          <Box sx={{ maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
            <TextField
              fullWidth
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleConfirm}
              sx={{ py: 1.5, fontSize: '1.05rem' }}
            >
              Vào hệ thống với vai trò {selectedRole.label}
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
