import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
  AppBar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as ProgramIcon,
  Work as JobIcon,
  School as CourseIcon,
  Campaign as AnnouncementIcon,
  QuestionAnswer as FaqIcon,
  SupportAgent as InquiryIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  KeyboardArrowLeft as CollapseIcon,
  KeyboardArrowRight as ExpandIcon,
  Settings as SettingsIcon,
  ViewCarousel as BannerIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useIsKorean } from '../../utils/language';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 72;

const allNavItems = [
  // Roles must match the route guards in App.jsx and the backend authorize() calls.
  { id: 'dashboard', label: '대시보드', labelEn: 'Dashboard', icon: <DashboardIcon />, path: '/admin', roles: ['admin', 'hr_manager'] },
  { id: 'users', label: '사용자 관리', labelEn: 'Users', icon: <PeopleIcon />, path: '/admin/users', roles: ['admin', 'hr_manager'] },
  { id: 'programs', label: '프로그램 관리', labelEn: 'Programs', icon: <ProgramIcon />, path: '/admin/programs', roles: ['admin', 'instructor'] },
  { id: 'courses', label: '강의 관리', labelEn: 'Courses', icon: <CourseIcon />, path: '/admin/courses', roles: ['admin', 'instructor'] },
  { id: 'consultations', label: '상담 관리', labelEn: 'Consultations', icon: <InquiryIcon />, path: '/admin/consultations', roles: ['admin', 'hr_manager'] },
  { id: 'jobs', label: '채용 관리', labelEn: 'Jobs', icon: <JobIcon />, path: '/admin/jobs', roles: ['admin'] },
  { id: 'announcements', label: '공지사항 관리', labelEn: 'Announcements', icon: <AnnouncementIcon />, path: '/admin/announcements', roles: ['admin'] },
  { id: 'faq', label: 'FAQ 관리', labelEn: 'FAQ', icon: <FaqIcon />, path: '/admin/faq', roles: ['admin'] },
  { id: 'inquiries', label: '문의 관리', labelEn: 'Inquiries', icon: <InquiryIcon />, path: '/admin/inquiries', roles: ['admin'] },
  { id: 'banners', label: '배너 관리', labelEn: 'Banners', icon: <BannerIcon />, path: '/admin/banners', roles: ['admin'] },
];

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();
  const isKorean = useIsKorean();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const sidebarWidth = collapsed && !isMobile ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // Filter nav items based on user role (admin sees all)
  const navItems = allNavItems
    .filter((item) => {
      if (user?.role === 'admin') return true;
      return item.roles.includes(user?.role);
    })
    .map((item) => ({ ...item, label: isKorean ? item.label : item.labelEn }));

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0F1B2D',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: collapsed && !isMobile ? 1 : 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          minHeight: 64,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {(!collapsed || isMobile) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0047BA 0%, #3366CC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            >
              W
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.02em' }}>
                {isKorean ? '우수선수 교육 CMS' : 'Training CMS'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                {isKorean ? '콘텐츠 관리' : 'Content Management'}
              </Typography>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? (isKorean ? '메뉴 펼치기' : 'Expand menu') : (isKorean ? '메뉴 접기' : 'Collapse menu')}
            sx={{ color: 'rgba(255,255,255,0.5)', p: 0.5, '&:hover': { color: '#fff' } }}
          >
            {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5, px: collapsed && !isMobile ? 0.75 : 1.5 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Tooltip
                key={item.id}
                title={collapsed && !isMobile ? item.label : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    borderRadius: '8px',
                    mb: 0.5,
                    px: collapsed && !isMobile ? 1.5 : 2,
                    py: 1,
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    bgcolor: active ? 'rgba(0, 71, 186, 0.35)' : 'transparent',
                    borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    '&:hover': {
                      bgcolor: active ? 'rgba(0, 71, 186, 0.4)' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed && !isMobile ? 0 : 36,
                      color: 'inherit',
                      justifyContent: 'center',
                    }}
                  >
                    {React.cloneElement(item.icon, { fontSize: 'small' })}
                  </ListItemIcon>
                  {(!collapsed || isMobile) && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Bottom - User site link */}
      <Box sx={{ p: collapsed && !isMobile ? 1 : 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Tooltip title={collapsed && !isMobile ? (isKorean ? '사용자 페이지' : 'User site') : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => navigate('/')}
            sx={{
              borderRadius: '8px',
              px: collapsed && !isMobile ? 1.5 : 2,
              py: 1,
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              color: 'rgba(255,255,255,0.5)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' },
            }}
          >
            <ListItemIcon
              sx={{ minWidth: collapsed && !isMobile ? 0 : 36, color: 'inherit', justifyContent: 'center' }}
            >
              <HomeIcon fontSize="small" />
            </ListItemIcon>
            {(!collapsed || isMobile) && (
              <ListItemText
                primary={isKorean ? '사용자 페이지' : 'User site'}
                primaryTypographyProps={{ fontSize: '0.8125rem' }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F2F5' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' } }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Box
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 0.2s ease',
          }}
        >
          <Box
            sx={{
              width: sidebarWidth,
              height: '100vh',
              position: 'fixed',
              top: 0,
              left: 0,
              transition: 'width 0.2s ease',
              zIndex: theme.zIndex.drawer,
            }}
          >
            {sidebarContent}
          </Box>
        </Box>
      )}

      {/* Main Area */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        {/* Top Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important', px: { xs: 2, md: 3 } }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }} aria-label={isKorean ? '메뉴' : 'menu'}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography variant="h6" noWrap sx={{ fontSize: '1rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
              {navItems.find((item) => isActive(item.path))?.label || (isKorean ? '관리자' : 'Admin')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={isKorean ? '알림' : 'Notifications'}>
                <IconButton size="small">
                  <Badge badgeContent={3} color="error" variant="dot">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>

              <IconButton
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ ml: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#0047BA',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {(user?.name_ko || user?.name || 'A').charAt(0)}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                  sx: { mt: 1, minWidth: 180, borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2">{(isKorean ? (user?.name_ko || user?.name_en) : (user?.name_en || user?.name_ko)) || user?.name || (isKorean ? '관리자' : 'Admin')}</Typography>
                  <Typography variant="caption" color="text.secondary">{user?.email || ''}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/'); }}>
                  <ListItemIcon><HomeIcon fontSize="small" /></ListItemIcon>
                  {isKorean ? '사용자 페이지' : 'User site'}
                </MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  {isKorean ? '설정' : 'Settings'}
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                  {isKorean ? '로그아웃' : 'Log out'}
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
