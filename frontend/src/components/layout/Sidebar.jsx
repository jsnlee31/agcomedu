import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Support as SupportIcon,
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useIsKorean } from '../../utils/language';

const DRAWER_WIDTH = 240;

const menuItems = [
  {
    id: 'home',
    labelKey: 'nav.home',
    icon: <HomeIcon />,
    path: '/',
    children: [
      { id: 'announcements', labelKey: 'home.announcements', path: '/announcements' },
      { id: 'calendar', labelKey: 'home.monthlyCalendar', path: '/calendar' },
    ],
  },
  {
    id: 'programs',
    labelKey: 'nav.programs',
    icon: <AssignmentIcon />,
    path: '/programs',
    children: [
      { id: 'program-list', labelKey: 'programs.recruitmentAnnouncements', path: '/programs' },
      { id: 'program-guide', labelKey: 'programs.applicationGuide', path: '/programs/guide' },
    ],
  },
  {
    id: 'activities',
    labelKey: 'nav.activities',
    icon: <PersonIcon />,
    path: '/activities',
    children: [
      { id: 'applications', labelKey: 'activities.applicationHistory', path: '/activities/applications' },
      { id: 'consultations', labelKey: 'activities.consultationRecords', path: '/activities/consultations' },
      { id: 'courses', labelKey: 'activities.courseStatus', path: '/activities/courses' },
      { id: 'booking', labelKey: '상담 예약', labelEn: 'Book consultation', path: '/consultations/booking' },
      // Consultant availability: only roles allowed by the backend (instructor/hr_manager/admin).
      { id: 'schedule', labelKey: '상담 일정 관리', labelEn: 'Consultation schedule', path: '/consultations/schedule', roles: ['instructor', 'hr_manager', 'admin'] },
    ],
  },
  {
    id: 'jobs',
    labelKey: 'nav.jobs',
    icon: <WorkIcon />,
    path: '/jobs',
    children: [
      { id: 'job-list', labelKey: 'jobs.jobPostings', path: '/jobs' },
      { id: 'recommendations', labelKey: 'jobs.recommendations', path: '/jobs/recommendations' },
      { id: 'favorites', labelKey: 'jobs.favorites', path: '/jobs/favorites' },
      { id: 'resume', labelKey: 'jobs.resumeManagement', path: '/jobs/resume' },
    ],
  },
  {
    id: 'learning',
    labelKey: 'nav.learning',
    icon: <SchoolIcon />,
    path: '/learning',
    children: [
      { id: 'lectures', labelKey: 'learning.onlineLectures', path: '/learning' },
      { id: 'downloads', labelKey: 'learning.downloads', path: '/learning/downloads' },
    ],
  },
  {
    id: 'support',
    labelKey: 'nav.support',
    icon: <SupportIcon />,
    path: '/support',
    children: [
      { id: 'notices', labelKey: 'support.notices', path: '/support/notices' },
      { id: 'faq', labelKey: 'support.faq', path: '/support/faq' },
      { id: 'inquiry', labelKey: 'support.inquiry', path: '/support/inquiry' },
    ],
  },
];

const adminMenuItems = [
  {
    id: 'admin',
    labelKey: '관리자 패널',
    labelEn: 'Admin panel',
    icon: <AdminIcon />,
    path: '/admin',
  },
];

const Sidebar = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, hasRole } = useAuth();
  const isKorean = useIsKorean();
  // Admin panel is available to every role that has at least one admin page
  // (instructors manage courses/programs there).
  const canSeeAdminPanel = hasRole(['admin', 'hr_manager', 'instructor']);

  const visibleMenuItems = React.useMemo(() => menuItems.map((item) => (
    item.children
      ? { ...item, children: item.children.filter((child) => !child.roles || (user && hasRole(child.roles))) }
      : item
  )), [user, hasRole]);

  const labelFor = (item) => {
    if (item.labelKey.includes('.')) return t(item.labelKey);
    return isKorean ? item.labelKey : (item.labelEn || item.labelKey);
  };

  const [expandedItems, setExpandedItems] = React.useState({});

  // Expand parent menu if current path matches a child
  React.useEffect(() => {
    const allMenus = [...visibleMenuItems, ...(canSeeAdminPanel ? adminMenuItems : [])];
    allMenus.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some(
          (child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
        );
        if (isActive) {
          setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname, visibleMenuItems, canSeeAdminPanel]);

  const handleItemClick = (item) => {
    if (item.children) {
      setExpandedItems((prev) => ({
        ...prev,
        [item.id]: !prev[item.id],
      }));
    } else {
      navigate(item.path);
      if (isMobile) {
        onClose();
      }
    }
  };

  const handleChildClick = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const isItemActive = (item) => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const renderMenuItems = (items) => (
    <List component="nav" sx={{ px: 1 }}>
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleItemClick(item)}
              selected={isItemActive(item) && !item.children}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 71, 186, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 71, 186, 0.12)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isItemActive(item) ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={labelFor(item)}
                primaryTypographyProps={{
                  fontWeight: isItemActive(item) ? 600 : 400,
                  color: isItemActive(item) ? 'primary.main' : 'inherit',
                  fontSize: '0.875rem',
                }}
              />
              {item.children && (
                expandedItems[item.id] ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItemButton>
          </ListItem>

          {item.children && (
            <Collapse in={Boolean(expandedItems[item.id])} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children.map((child) => (
                  <ListItemButton
                    key={child.id}
                    onClick={() => handleChildClick(child.path)}
                    selected={location.pathname === child.path}
                    sx={{
                      pl: 6,
                      py: 0.75,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 71, 186, 0.08)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={labelFor(child)}
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        fontWeight: location.pathname === child.path ? 500 : 400,
                        color: location.pathname === child.path ? 'primary.main' : 'text.secondary',
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      ))}
    </List>
  );

  const drawerContent = (
    <Box sx={{ overflow: 'auto', mt: 1 }}>
      {renderMenuItems(visibleMenuItems)}

      {/* Admin menu */}
      {canSeeAdminPanel && (
        <>
          <Box sx={{ mx: 2, my: 1, borderTop: '1px solid #E5E5E5' }} />
          {renderMenuItems(adminMenuItems)}
        </>
      )}
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop drawer */
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
