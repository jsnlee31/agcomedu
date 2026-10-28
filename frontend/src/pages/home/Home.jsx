import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CardContent,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Campaign as AnnouncementIcon,
  Chat as ChatIcon,
  MenuBook as MenuBookIcon,
  School as SchoolIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiObject, dashboardAPI } from '../../services/api';
import CategoryBadge from '../../components/common/CategoryBadge';
import { statusColors } from '../../styles/theme';
import { useIsKorean } from '../../utils/language';

const StatCard = ({ icon, label, value, path }) => {
  const navigate = useNavigate();
  return (
    <Card onClick={() => path && navigate(path)} sx={{ cursor: path ? 'pointer' : 'default', height: '100%' }}>
      <CardContent>
        <Box sx={{ color: 'primary.main', mb: 1 }}>{icon}</Box>
        <Typography variant="h4" fontWeight={700}>{Number(value || 0).toLocaleString()}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
};

const PROGRAM_STATUS = {
  open: ['모집중', '모집중', 'Recruiting'],
  recruiting: ['모집중', '모집중', 'Recruiting'],
  in_progress: ['진행중', '진행중', 'In progress'],
  closed: ['종료', '마감', 'Closed'],
  completed: ['완료', '완료', 'Completed'],
  cancelled: ['취소', '취소', 'Cancelled'],
};

const ProgramStatusChip = ({ status, isKorean }) => {
  if (!status) return null;
  const info = PROGRAM_STATUS[String(status).toLowerCase()] || [status, status, status];
  const colors = statusColors[info[0]] || { bg: '#F3F4F6', text: '#6B7280' };
  return <Chip label={isKorean ? info[1] : info[2]} size="small" sx={{ backgroundColor: colors.bg, color: colors.text, fontWeight: 500, fontSize: '0.75rem', height: 24 }} />;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ko-KR');
};

const EmptyState = ({ text }) => (
  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>{text}</Typography>
);

const Home = () => {
  useAuth();
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setMessage('');
      try {
        const response = await dashboardAPI.getHome();
        setDashboardData(apiObject(response.data));
      } catch {
        setDashboardData({});
        setMessage(isKorean ? '대시보드 데이터를 불러오지 못했습니다.' : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isKorean]);

  const stats = dashboardData?.stats || {};
  const announcements = Array.isArray(dashboardData?.announcements) ? dashboardData.announcements : [];
  const programs = Array.isArray(dashboardData?.programs) ? dashboardData.programs : [];
  const jobs = Array.isArray(dashboardData?.jobs) ? dashboardData.jobs : [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>{isKorean ? '우수선수 육성인력 교육 대시보드' : 'Training Dashboard'}</Typography>
        <Typography variant="body2" color="text.secondary">{isKorean ? '프로그램, 학습, 상담, 공지사항을 한눈에 확인합니다.' : 'Live programs, learning, consultations, and notices.'}</Typography>
      </Box>

      {message && <Alert severity="warning" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? [1, 2, 3].map((item) => <Grid size={{ xs: 12, md: 4 }} key={item}><Skeleton variant="rectangular" height={120} /></Grid>) : (
          <>
            <Grid size={{ xs: 12, md: 4 }}><StatCard icon={<AssignmentIcon />} label={isKorean ? '신청한 프로그램' : 'Applied programs'} value={stats.appliedPrograms} path="/activities/applications" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><StatCard icon={<ChatIcon />} label={isKorean ? '예정된 상담' : 'Scheduled consultations'} value={stats.scheduledConsultations} path="/activities/consultations" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><StatCard icon={<SchoolIcon />} label={isKorean ? '진행 중인 강의' : 'Ongoing courses'} value={stats.ongoingCourses} path="/learning" /></Grid>
          </>
        )}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}><AnnouncementIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />{isKorean ? '공지사항' : 'Announcements'}</Typography>
                <Button size="small" onClick={() => navigate('/support/notices')}>{isKorean ? '전체 보기' : 'View all'}</Button>
              </Box>
              {loading ? [1, 2, 3].map((item) => <Skeleton key={item} height={48} />) : announcements.length === 0 ? <EmptyState text={isKorean ? '등록된 공지사항이 없습니다.' : 'No announcements are available.'} /> : announcements.slice(0, 5).map((item) => (
                <Box key={item.id} onClick={() => navigate('/support/notices')} sx={{ py: 1.5, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  <Typography fontWeight={600}>{(isKorean ? item.title_ko || item.title_en : item.title_en || item.title_ko) || item.title || '-'}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(item.created_at || item.date)}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}><WorkIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />{isKorean ? '채용 추천' : 'Job Recommendations'}</Typography>
                <Button size="small" onClick={() => navigate('/jobs')}>{isKorean ? '전체 보기' : 'View all'}</Button>
              </Box>
              {loading ? [1, 2].map((item) => <Skeleton key={item} height={56} />) : jobs.length === 0 ? <EmptyState text={isKorean ? '채용 추천이 없습니다.' : 'No job recommendations are available.'} /> : jobs.slice(0, 4).map((job) => (
                <Box key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} sx={{ py: 1.5, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  <Typography fontWeight={600}>{(isKorean ? job.title_ko || job.title_en : job.title_en || job.title_ko) || job.title || '-'}</Typography>
                  <Typography variant="caption" color="text.secondary">{job.company || job.company_name || '-'} | {job.location || '-'}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}><MenuBookIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />{isKorean ? '프로그램' : 'Programs'}</Typography>
                <Button size="small" onClick={() => navigate('/programs')}>{isKorean ? '전체 보기' : 'View all'}</Button>
              </Box>
              <Grid container spacing={2}>
                {loading ? [1, 2].map((item) => <Grid size={{ xs: 12, md: 6 }} key={item}><Skeleton variant="rectangular" height={150} /></Grid>) : programs.length === 0 ? <Grid size={12}><EmptyState text={isKorean ? '등록된 프로그램이 없습니다.' : 'No programs are available.'} /></Grid> : programs.slice(0, 4).map((program) => (
                  <Grid size={{ xs: 12, md: 6 }} key={program.id}>
                    <Card variant="outlined" onClick={() => navigate(`/programs/${program.id}`)} sx={{ cursor: 'pointer' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>{program.category && <CategoryBadge category={program.category} />}<ProgramStatusChip status={program.status} isKorean={isKorean} /></Box>
                        <Typography fontWeight={700}>{(isKorean ? program.title_ko || program.title_en : program.title_en || program.title_ko) || program.title || '-'}</Typography>
                        <Typography variant="body2" color="text.secondary">{formatDate(program.program_start || program.recruitment_start)} ~ {formatDate(program.program_end || program.recruitment_end)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home;
