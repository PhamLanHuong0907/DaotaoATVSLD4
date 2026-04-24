import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Email as EmailIcon,
  Call as CallIcon
} from '@mui/icons-material';
import logoImage from '@/assets/logo1.png';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        width: '100%',
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ bgcolor: 'primary.main', position: 'relative' }}>
        <Box sx={{ position: 'absolute', left: 16, top: { xs: 8, sm: 16 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={onToggleSidebar} sx={{ color: 'white' }}>
              <MenuIcon />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexDirection: 'column', width: '100%' }}>
          <Typography variant="h5" noWrap sx={{ color: 'white', textAlign: 'center', marginTop: 3, fontWeight: 'bold' }}>
            HỆ THỐNG HUẤN LUYỆN ATVSLĐ
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src={logoImage}
              alt="Ecotel Logo"
              sx={{
                height: 36,
                width: 'auto',
                filter: 'brightness(0) invert(1)',
              }}
            />
            <Typography variant="h6" noWrap sx={{ color: 'white', textAlign: 'center', marginLeft: -1, fontWeight: 'bold' }}>
              CÔNG TY TNHH ECOTEL
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CallIcon sx={{ color: 'white' }} />
              <Typography variant="body2" color="white" fontWeight={500} sx={{ display: { xs: 'none', lg: 'block' } }}>
                Hotline: 0378655822
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ color: 'white' }} />
              <Typography variant="body2" color="white" fontWeight={500} sx={{ display: { xs: 'none', lg: 'block' } }}>
                Email: info@ecotel.com.vn
              </Typography>
            </Box>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
