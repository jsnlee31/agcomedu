import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, LinearProgress, Typography } from '@mui/material';
import api, { apiArray, consultationsAPI, coursesAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const APPLICATION_STATUS = {
  pending: ['승인대기', 'Pending review', 'warning'],
  submitted: ['승인대기', 'Pending review', 'warning'],
  '승인대기': ['승인대기', 'Pending review', 'warning'],
  approved: ['승인완료', 'Approved', 'success'],
  approval_complete: ['승인완료', 'Approved', 'success'],
  '승인완료': ['승인완료', 'Approved', 'success'],
  rejected: ['반려', 'Rejected', 'error'],
  '반려': ['반려', 'Rejected', 'error'],
  completed: ['완료', 'Completed', 'default'],
  '완료': ['완료', 'Completed', 'default'],
  cancelled: ['취소', 'Cancelled', 'default'],
  '취소': ['취소', 'Cancelled', 'default'],
};

const CONSULTATION_STATUS = {
  scheduled: ['예정', 'Scheduled'],
  pending: ['대기', 'Pending'],
  confirmed: ['확정', 'Confirmed'],
  completed: ['완료', 'Completed'],
  cancelled: ['취소', 'Cancelled'],
};

const formatDate = (value, withTime = false) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return withTime
    ? date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR');
};

const MyActivities = () => {
  const isKorean = useIsKorean();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [consultationResponse, courseResponse, applicationResponse] = await Promise.allSettled([
          consultationsAPI.getMine(),
          coursesAPI.getEnrollments(),
          api.get('/programs/my/applications'),
        ]);
        setConsultations(consultationResponse.status === 'fulfilled' ? apiArray(consultationResponse.value.data, 'consultations') : []);
        setCourses(courseResponse.status === 'fulfilled' ? apiArray(courseResponse.value.data, 'enrollments') : []);
        setApplications(applicationResponse.status === 'fulfilled' ? apiArray(applicationResponse.value.data, 'applications') : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pickTitle = (item, fallback) => (isKorean ? item.title_ko || item.title_en : item.title_en || item.title_ko) || fallback;

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Typography variant="h5" fontWeight={700}>{isKorean ? '나의 활동' : 'My Activities'}</Typography><Typography variant="body2" color="text.secondary">{isKorean ? '프로그램 신청, 수강, 상담 내역을 한눈에 확인하세요.' : 'Your program applications, courses and consultations.'}</Typography></Box>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          <Grid size={12}>
            <Card><CardContent>
              <Typography variant="h6" fontWeight={700}>{isKorean ? '프로그램 신청 내역' : 'Program Applications'}</Typography>
              {applications.length === 0 ? <Typography color="text.secondary">{isKorean ? '신청한 프로그램이 없습니다.' : 'No program applications yet.'}</Typography> : applications.map((item) => {
                const status = APPLICATION_STATUS[String(item.status || 'pending').toLowerCase()] || APPLICATION_STATUS[item.status] || APPLICATION_STATUS.pending;
                const appliedAt = formatDate(item.applied_at || item.created_at);
                const period = item.start_date ? `${formatDate(item.start_date)} ~ ${formatDate(item.end_date) || ''}` : '';
                return (
                  <Box key={item.id} onClick={() => item.program_id && navigate(`/programs/${item.program_id}`)} sx={{ mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', cursor: item.program_id ? 'pointer' : 'default' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ wordBreak: 'break-word' }}>{pickTitle(item, isKorean ? '프로그램' : 'Program')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[appliedAt && `${isKorean ? '신청일' : 'Applied'} ${appliedAt}`, period && `${isKorean ? '운영' : 'Period'} ${period}`].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <Chip size="small" color={status[2]} label={isKorean ? status[0] : status[1]} />
                  </Box>
                );
              })}
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" fontWeight={700}>{isKorean ? '강의' : 'Courses'}</Typography>{courses.length === 0 ? <Typography color="text.secondary">{isKorean ? '수강 활동이 없습니다.' : 'No course activity is available.'}</Typography> : courses.map((course) => {
            const percent = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));
            return (
              <Box key={course.id} sx={{ mt: 1, cursor: course.course_id ? 'pointer' : 'default' }} onClick={() => course.course_id && navigate(`/learning/${course.course_id}`)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography sx={{ wordBreak: 'break-word' }}>{pickTitle(course, isKorean ? '강의' : 'Course')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{course.is_completed ? (isKorean ? '완료' : 'Done') : `${percent}%`}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={course.is_completed ? 100 : percent} sx={{ height: 4, borderRadius: 2, mt: 0.5 }} />
              </Box>
            );
          })}</CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" fontWeight={700}>{isKorean ? '상담' : 'Consultations'}</Typography>{consultations.length === 0 ? <Typography color="text.secondary">{isKorean ? '상담 내역이 없습니다.' : 'No consultations are available.'}</Typography> : consultations.map((item) => {
            const status = CONSULTATION_STATUS[String(item.status || '').toLowerCase()];
            return (
              <Box key={item.id} sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ wordBreak: 'break-word' }}>{item.topic || item.title || (isKorean ? '상담' : 'Consultation')}</Typography>
                  <Typography variant="caption" color="text.secondary">{[formatDate(item.scheduled_at, true), item.consultant_name].filter(Boolean).join(' · ')}</Typography>
                </Box>
                {status ? <Chip size="small" variant="outlined" label={isKorean ? status[0] : status[1]} /> : (item.status ? <Chip size="small" variant="outlined" label={item.status} /> : null)}
              </Box>
            );
          })}</CardContent></Card></Grid>
        </Grid>
      )}
    </Box>
  );
};

export default MyActivities;
