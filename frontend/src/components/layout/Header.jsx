import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LanguageToggle from './LanguageToggle';
import AsianGamesCursorIcon from '../common/AsianGamesCursorIcon';
import { useHomeSettings } from '../../utils/siteSettings';
import { useIsKorean } from '../../utils/language';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { settings } = useHomeSettings();
  const isKorean = useIsKorean();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationAnchor, setNotificationAnchor] = React.useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/welcome');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: '#FFFFFF',
        color: '#333333',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {isMobile && (
          <IconButton edge="start" color="inherit" aria-label={isKorean ? '메뉴' : 'menu'} onClick={onMenuToggle} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Box
          onClick={() => navigate('/')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            minWidth: 0,
          }}
        >
          {settings.logoImageUrl ? (
            <Box
              component="img"
              src={settings.logoImageUrl}
              alt={settings.platformName}
              sx={{ height: 38, width: 38, objectFit: 'contain', display: { xs: 'none', sm: 'block' } }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <AsianGamesCursorIcon compact interactive={false} />
            </Box>
          )}
          <Typography
            variant="h6"
            sx={{
              color: '#0047BA',
              fontWeight: 800,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.125rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 190, sm: 360, md: 640 },
            }}
          >
            {isKorean ? (settings.platformName || settings.platformNameEn) : (settings.platformNameEn || settings.platformName)}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
          <LanguageToggle />

          <IconButton color="inherit" onClick={(event) => setNotificationAnchor(event.currentTarget)} aria-label={isKorean ? '알림' : 'notifications'}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            PaperProps={{ sx: { width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 400 } }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #E5E5E5' }}>
              <Typography variant="subtitle1" fontWeight={700}>{isKorean ? '알림' : 'Notifications'}</Typography>
            </Box>
            <MenuItem onClick={() => setNotificationAnchor(null)}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{isKorean ? '새 교육 자료가 등록되었습니다.' : 'New learning materials have been posted.'}</Typography>
                <Typography variant="caption" color="text.secondary">{isKorean ? '5분 전' : '5 minutes ago'}</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => setNotificationAnchor(null)}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{isKorean ? '신청 상태가 업데이트되었습니다.' : 'Your application status was updated.'}</Typography>
                <Typography variant="caption" color="text.secondary">{isKorean ? '1시간 전' : '1 hour ago'}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setNotificationAnchor(null);
                navigate('/support/notices');
              }}
              sx={{ justifyContent: 'center' }}
            >
              <Typography variant="body2" color="primary">{isKorean ? '모든 알림 보기' : 'View all notifications'}</Typography>
            </MenuItem>
          </Menu>

          <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ ml: { xs: 0, sm: 1 } }} aria-label={isKorean ? '프로필' : 'profile'}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#0047BA', fontSize: '0.875rem' }} src={user?.profile_image}>
              {user?.name_ko?.charAt(0) || user?.name_en?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { width: 220 } }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #E5E5E5' }}>
              <Typography variant="subtitle2" fontWeight={700}>{isKorean ? (user?.name_ko || user?.name_en || '사용자') : (user?.name_en || user?.name_ko || 'User')}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
              {isKorean ? '프로필' : 'Profile'}
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
              {isKorean ? '설정' : 'Settings'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
              {isKorean ? '로그아웃' : 'Log out'}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
