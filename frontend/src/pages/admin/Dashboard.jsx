import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Assignment as ProgramIcon,
  Campaign as AnnouncementIcon,
  People as PeopleIcon,
  School as CourseIcon,
  SupportAgent as ConsultationIcon,
  Work as JobIcon,
} from '@mui/icons-material';
import { dashboardAPI, programsAPI, coursesAPI, jobsAPI, announcementsAPI, consultationsAPI, usersAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';
import { useAuth } from '../../contexts/AuthContext';
import { EditStageToolbar, ResizableFrame, resetStageSizes } from '../../components/admin/EditStageTools';

const metricCards = [
  { key: 'users', label: 'Users', labelKo: '사용자', icon: <PeopleIcon />, path: '/admin/users' },
  { key: 'programs', label: 'Programs', labelKo: '프로그램', icon: <ProgramIcon />, path: '/admin/programs' },
  { key: 'courses', label: 'Courses', labelKo: '강의', icon: <CourseIcon />, path: '/admin/courses' },
  { key: 'jobs', label: 'Jobs', labelKo: '채용', icon: <JobIcon />, path: '/admin/jobs' },
  { key: 'announcements', label: 'Notices', labelKo: '공지', icon: <AnnouncementIcon />, path: '/admin/announcements' },
  { key: 'consultations', label: 'Consultations', labelKo: '상담', icon: <ConsultationIcon />, path: '/admin/consultations' },
];

const countFrom = (payload, keys = []) => {
  const total = Number(payload?.pagination?.total);
  if (Number.isFinite(total) && payload?.pagination) return total;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key].length;
    if (typeof payload?.[key] === 'number') return payload[key];
  }
  if (Array.isArray(payload)) return payload.length;
  return 0;
};

const listFrom = (payload, key) => {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatDate = (value, isKorean) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(isKorean ? 'ko-KR' : 'en-US');
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const { isSuperAdmin, user } = useAuth();
  const visibleCards = metricCards.filter((card) => {
    if (user?.role === 'admin') return true;
    // hr_manager can open users and consultations only.
    return ['users', 'consultations'].includes(card.key);
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [metrics, setMetrics] = useState({});
  const [recent, setRecent] = useState([]);
  const [editStage, setEditStage] = useState(false);
  const stageScope = 'admin_dashboard';

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setMessage('');
      try {
        const [stats, users, programs, courses, jobs, announcements, consultationStats] = await Promise.allSettled([
          dashboardAPI.getStats(),
          usersAPI.getAll(),
          programsAPI.getAll(),
          coursesAPI.getAll(),
          jobsAPI.getAll(),
          announcementsAPI.getAll(),
          consultationsAPI.getAdminStats(),
        ]);

        const statsData = stats.status === 'fulfilled' ? stats.value.data : {};
        const userData = users.status === 'fulfilled' ? users.value.data : {};
        const programData = programs.status === 'fulfilled' ? programs.value.data : {};
        const courseData = courses.status === 'fulfilled' ? courses.value.data : {};
        const jobData = jobs.status === 'fulfilled' ? jobs.value.data : {};
        const announcementData = announcements.status === 'fulfilled' ? announcements.value.data : {};
        const consultationData = consultationStats.status === 'fulfilled' ? consultationStats.value.data : {};

        setMetrics({
          users: statsData.users ?? countFrom(userData, ['users']),
          programs: statsData.programs ?? countFrom(programData, ['programs']),
          courses: statsData.courses ?? countFrom(courseData, ['courses']),
          jobs: statsData.jobs ?? countFrom(jobData, ['jobs']),
          announcements: statsData.announcements ?? countFrom(announcementData, ['announcements']),
          consultations: statsData.consultations ?? Number(consultationData.summary?.total ?? 0),
        });

        const pickTitle = (item) => (isKorean ? item.title_ko || item.title_en : item.title_en || item.title_ko) || item.title;
        setRecent([
          ...listFrom(announcementData, 'announcements').slice(0, 3).map((item) => ({ type: isKorean ? '공지' : 'Notice', title: pickTitle(item), date: item.created_at || item.date })),
          ...listFrom(programData, 'programs').slice(0, 3).map((item) => ({ type: isKorean ? '프로그램' : 'Program', title: pickTitle(item), date: item.created_at || item.program_start })),
          ...listFrom(courseData, 'courses').slice(0, 3).map((item) => ({ type: isKorean ? '강의' : 'Course', title: pickTitle(item), date: item.created_at })),
        ].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0)));
      } catch {
        setMessage(isKorean ? '관리자 대시보드를 불러오지 못했습니다.' : 'Unable to load the admin dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isKorean]);

  const resetFrames = () => {
    resetStageSizes(stageScope);
    window.location.reload();
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>{isKorean ? '관리자 대시보드' : 'Admin Dashboard'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isKorean ? '2026 우수선수 육성인력 교육 플랫폼 실시간 현황입니다.' : '2026 Elite Athlete Development Staff Training live overview.'}
          </Typography>
        </Box>
        {isSuperAdmin() && (
          <EditStageToolbar enabled={editStage} onToggle={() => setEditStage((value) => !value)} onReset={resetFrames} />
        )}
      </Box>

      {message && <Alert severity="warning" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleCards.map((card) => (
          <Grid size={{ xs: 6, md: 4, lg: 2 }} key={card.key}>
            <ResizableFrame scope={stageScope} id={`metric_${card.key}`} enabled={editStage} minHeight={118}>
              <Card onClick={() => !editStage && navigate(card.path)} sx={{ cursor: editStage ? 'default' : 'pointer', height: '100%' }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 1 }}>{card.icon}</Box>
                  {loading ? <Skeleton width={60} height={40} /> : <Typography variant="h4" fontWeight={800}>{Number(metrics[card.key] || 0).toLocaleString()}</Typography>}
                  <Typography variant="body2" color="text.secondary">{isKorean ? card.labelKo : card.label}</Typography>
                </CardContent>
              </Card>
            </ResizableFrame>
          </Grid>
        ))}
      </Grid>

      <ResizableFrame scope={stageScope} id="recent_content" enabled={editStage} minHeight={260} minWidth={320}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={800}>{isKorean ? '최근 콘텐츠' : 'Recent Content'}</Typography>
              <Button size="small" onClick={() => navigate('/admin/programs')} disabled={editStage || user?.role !== 'admin'}>
                {isKorean ? '콘텐츠 관리' : 'Manage content'}
              </Button>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{isKorean ? '유형' : 'Type'}</TableCell>
                    <TableCell>{isKorean ? '제목' : 'Title'}</TableCell>
                    <TableCell>{isKorean ? '날짜' : 'Date'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? [1, 2, 3].map((item) => <TableRow key={item}><TableCell colSpan={3}><Skeleton /></TableCell></TableRow>) : recent.length === 0 ? (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>{isKorean ? '최근 콘텐츠가 없습니다.' : 'No recent content.'}</TableCell></TableRow>
                  ) : recent.map((item, index) => (
                    <TableRow key={`${item.type}-${index}`}>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.title || '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.date, isKorean)}</TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </ResizableFrame>
    </Box>
  );
};

export default AdminDashboard;
