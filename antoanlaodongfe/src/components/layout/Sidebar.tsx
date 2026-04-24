import { useEffect, useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Collapse,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as ExamIcon,
  History as HistoryIcon,
  MenuBook as StudyIcon,
  Description as TemplateIcon,
  PlaylistAddCheck as ManageIcon,
  Folder as DocumentIcon,
  School as CourseIcon,
  QuestionAnswer as QuestionIcon,
  People as UserIcon,
  BarChart as ReportIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Room as RoomIcon,
  EventNote as PeriodIcon,
  CalendarMonth as CalendarIcon,
  EmojiEvents as CertificateIcon,
  ManageHistory as AuditIcon,
  LibraryBooks as MyCoursesIcon,
  AccountCircle,
  Inbox as InboxIcon,

  EmojiEvents as AchievementsIcon,
  Forum as ForumIcon,
  Domain as FacilityIcon,
  Webhook as WebhookIcon,
  AccountTree as DepartmentIcon,
  DarkMode,
  LightMode,
  GetApp,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import NotificationBell from '@/components/common/NotificationBell';
import { onInstallAvailability, triggerInstall } from '@/utils/pwa';

const DRAWER_WIDTH = 260;

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên',
  training_officer: 'Cán bộ đào tạo',
  worker: 'Người lao động',
  manager: 'Cán bộ quản lý',
};

function UserProfileMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!user) return null;

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          p: 0.5,
          px: 1,
          borderRadius: 2,
          '&:hover': { bgcolor: 'action.hover' },
          flexShrink: 0,
        }}
      >
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 18 }}>
          {user.full_name?.charAt(0)}
        </Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.primary" fontWeight={600} noWrap>
            {user.full_name}
          </Typography>
          <Chip
            label={roleLabels[user.role] || user.role}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, pointerEvents: 'none' }}
          />
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ elevation: 3, sx: { mt: 1, minWidth: 200 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
            {user.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {roleLabels[user.role] || user.role}
          </Typography>
        </Box>
        <Divider sx={{ mt: 0, mb: 1 }} />
        <MenuItem onClick={() => { handleClose(); onLogout(); }}>
          <ListItemIcon sx={{ minWidth: 32 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Đăng xuất</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const getNavConfig = (user: any): NavItem[] => {
  const isStaff = user?.role === 'admin' || user?.role === 'training_officer' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const baseNav: NavItem[] = [
    { label: 'Tổng quan', path: '/dashboard', icon: <DashboardIcon /> },
  ];

  if (isStaff) {
    baseNav.push(
      {
        label: 'Quản lý khóa học',
        icon: <CourseIcon />,
        children: [
          { label: 'Khóa học', path: '/admin/courses', icon: <CourseIcon /> },
          { label: 'Ngân hàng câu hỏi', path: '/admin/questions', icon: <QuestionIcon /> },
          { label: 'Kho tài liệu', path: '/admin/documents', icon: <DocumentIcon /> },
        ],
      },
      {
        label: 'Quản lý kỳ thi',
        icon: <ManageIcon />,
        children: [
          { label: 'Kỳ thi', path: '/admin/periods', icon: <PeriodIcon /> },
          { label: 'Đề thi', path: '/admin/exams', icon: <ManageIcon /> },
          { label: 'Mẫu đề thi', path: '/admin/templates', icon: <TemplateIcon /> },
          { label: 'Phòng thi', path: '/admin/rooms', icon: <RoomIcon /> },
          { label: 'Cơ sở vật chất', path: '/admin/facilities', icon: <FacilityIcon /> }
        ],
      },
      {
        label: 'Hệ thống',
        icon: <SettingsIcon />,
        children: [
          { label: 'Hộp duyệt', path: '/admin/approvals', icon: <InboxIcon /> },
          ...(isAdmin ? [
            { label: 'Người dùng', path: '/admin/users', icon: <UserIcon /> },
            { label: 'Phòng ban', path: '/admin/departments', icon: <DepartmentIcon /> },
            { label: 'Danh mục (Nghề/Chứng chỉ)', path: '/admin/catalogs', icon: <DepartmentIcon /> },
            { label: 'Cấu hình', path: '/admin/settings', icon: <SettingsIcon /> },
            { label: 'Nhật ký hệ thống', path: '/admin/audit-logs', icon: <AuditIcon /> },
            { label: 'Webhooks', path: '/admin/webhooks', icon: <WebhookIcon /> },
          ] : [])
        ]
      },
      { label: 'Thống kê & Báo cáo', path: '/admin/reports', icon: <ReportIcon /> }
    );
  } else {
    baseNav.push(
      {
        label: 'Học tập & Ôn luyện',
        icon: <StudyIcon />,
        children: [
          { label: 'Khóa học & Ôn luyện', path: '/study', icon: <MyCoursesIcon /> },
          { label: 'Luyện thi', path: '/exams', icon: <ExamIcon /> },
          { label: 'Lịch sử luyện thi', path: '/practice/history', icon: <HistoryIcon /> },
        ],
      },
      {
        label: 'Kỳ thi',
        icon: <ExamIcon />,
        children: [
          { label: 'Danh sách bài thi', path: '/official_exams', icon: <ExamIcon /> },
          { label: 'Lịch thi của tôi', path: '/exams/schedule', icon: <CalendarIcon /> },
          { label: 'Lịch sử thi', path: '/official_exams/history', icon: <HistoryIcon /> },
        ],
      },
      {
        label: 'Cá nhân & CĐ',
        icon: <AccountCircle />,
        children: [
          { label: 'Diễn đàn', path: '/forum', icon: <ForumIcon /> },
          { label: 'Chứng chỉ', path: '/certificates', icon: <CertificateIcon /> },
          { label: 'Thành tích', path: '/achievements', icon: <AchievementsIcon /> },
          { label: 'Hồ sơ cá nhân', path: '/profile', icon: <AccountCircle /> },
        ],
      }
    );
  }

  return baseNav;
};

interface NavItemProps {
  item: NavItem;
  isActive: (path?: string) => boolean;
  handleNav: (path: string) => void;
  isMobile: boolean;
}

function NavItemComponent({ item, isActive, handleNav, isMobile }: NavItemProps) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const hasChildren = Boolean(item.children && item.children.length > 0);

  const isChildActive = hasChildren
    ? item.children!.some((c) => c.path && isActive(c.path))
    : (item.path ? isActive(item.path) : false);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (hasChildren) {
      if (isMobile) {
        setOpen(!open);
      } else {
        setAnchorEl(e.currentTarget);
      }
    } else if (item.path) {
      handleNav(item.path);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChildClick = (path: string) => {
    handleNav(path);
    handleClose();
  };

  const buttonContent = (
    <ListItemButton
      selected={!hasChildren ? (item.path ? isActive(item.path) : false) : isChildActive}
      onClick={handleClick}
      sx={{
        borderRadius: 2,
        whiteSpace: 'nowrap',
        width: 'auto',
        mr: isMobile ? 0 : 2, // Tăng khoảng cách margin-right giữa các nút tại đây
        mb: isMobile ? 1 : 0,
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'white',
          '& .MuiListItemIcon-root': { color: 'white' },
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText primary={item.label} sx={{ fontWeight: isChildActive ? 600 : 400 }} />
      {hasChildren && (
        isMobile ? (
          open ? <ExpandLessIcon sx={{ ml: 1 }} /> : <ExpandMoreIcon sx={{ ml: 1 }} />
        ) : (
          <ExpandMoreIcon sx={{ ml: 1, fontSize: 18 }} />
        )
      )}
    </ListItemButton>
  );

  return (
    <ListItem disablePadding sx={{ width: isMobile ? '100%' : 'auto', display: 'block' }}>
      {buttonContent}

      {hasChildren && isMobile && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children!.map((child) => (
              <ListItemButton
                key={child.label}
                selected={child.path ? isActive(child.path) : false}
                onClick={() => child.path && handleChildClick(child.path)}
                sx={{
                  pl: 4,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{child.icon}</ListItemIcon>
                <ListItemText primary={child.label} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      )}

      {hasChildren && !isMobile && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          MenuListProps={{
            sx: { p: 1 },
          }}
          PaperProps={{
            elevation: 3,
            sx: { mt: 1, borderRadius: 2, minWidth: 200 },
          }}
        >
          {item.children!.map((child) => (
            <MenuItem
              key={child.label}
              selected={child.path ? isActive(child.path) : false}
              onClick={() => child.path && handleChildClick(child.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{child.icon}</ListItemIcon>
              <ListItemText sx={{ color: 'inherit' }}>{child.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      )}
    </ListItem>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();

  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => onInstallAvailability(setCanInstall), []);

  const navItemsConfig = getNavConfig(user);

  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/exams') return location.pathname === '/exams';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    if (isMobile) onClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExamIcon color="primary" />
          <Typography variant="h6" color="primary" noWrap fontWeight={700}>
            ATVSLĐ
          </Typography>
        </Box>
      </Toolbar>
      <Divider />

      <List sx={{ px: 1, pt: 2, flexGrow: 1, overflowY: 'auto' }}>
        {navItemsConfig.map((item) => (
          <NavItemComponent
            key={item.label}
            item={item}
            isActive={isActive}
            handleNav={handleNav}
            isMobile={true}
          />
        ))}
      </List>

      <Divider sx={{ mx: 2 }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          {canInstall && (
            <Tooltip title="Cài đặt ứng dụng">
              <IconButton onClick={() => triggerInstall()} color="primary">
                <GetApp />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
            <IconButton onClick={toggle} color="primary">
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Box>
            <NotificationBell />
          </Box>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <UserProfileMenu user={user} onLogout={handleLogout} />
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Box component="nav" sx={{ width: 0, flexShrink: 0 }}>
          <Drawer
            variant="temporary"
            open={open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
          >
            {drawerContent}
          </Drawer>
        </Box>
      ) : (
        <Box
          component="nav"
          sx={{
            width: '100%',
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            overflowX: 'auto',
            px: 2,
            py: 1,
            // Auto hide scrollbar for sleekness
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          <List
            sx={{
              display: 'flex',
              flexDirection: 'row',
              p: 0,
              m: 0,
              flexWrap: 'nowrap',
              alignItems: 'center',
            }}
          >
            {navItemsConfig.map((item) => (
              <NavItemComponent
                key={item.label}
                item={item}
                isActive={isActive}
                handleNav={handleNav}
                isMobile={false}
              />
            ))}
          </List>
          <Box sx={{ flexGrow: 1, minWidth: 16 }} />

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 2 }}>
            {canInstall && (
              <Tooltip title="Cài đặt ứng dụng">
                <Button
                  size="small" variant="outlined" startIcon={<GetApp />}
                  onClick={() => triggerInstall()}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderRadius: 2 }}
                >
                  Cài app
                </Button>
              </Tooltip>
            )}
            <Tooltip title={mode === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
              <IconButton onClick={toggle} size="small" color="primary">
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
            <Box>
              <NotificationBell />
            </Box>
          </Stack>

          <UserProfileMenu user={user} onLogout={handleLogout} />
        </Box>
      )}
    </>
  );
}

export { DRAWER_WIDTH };
