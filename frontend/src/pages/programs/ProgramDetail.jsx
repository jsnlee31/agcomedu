import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Skeleton, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { apiObject, programsAPI } from '../../services/api';
import CategoryBadge from '../../components/common/CategoryBadge';
import { statusColors } from '../../styles/theme';
import { useIsKorean } from '../../utils/language';

const PROGRAM_STATUS = {
  open: { key: '모집중', en: 'Recruiting' },
  recruiting: { key: '모집중', en: 'Recruiting' },
  '모집중': { key: '모집중', en: 'Recruiting' },
  closing_soon: { key: '마감예정', en: 'Closing soon' },
  '마감예정': { key: '마감예정', en: 'Closing soon' },
  in_progress: { key: '진행중', en: 'In progress' },
  '진행중': { key: '진행중', en: 'In progress' },
  closed: { key: '종료', label: '마감', en: 'Closed' },
  '마감': { key: '종료', label: '마감', en: 'Closed' },
  '종료': { key: '종료', en: 'Closed' },
  completed: { key: '완료', en: 'Completed' },
  '완료': { key: '완료', en: 'Completed' },
  cancelled: { key: '취소', en: 'Cancelled' },
  canceled: { key: '취소', en: 'Cancelled' },
  '취소': { key: '취소', en: 'Cancelled' },
};
const CLOSED_STATUSES = ['closed', 'completed', 'cancelled', 'canceled', '종료', '마감', '완료', '취소'];

const APPLICATION_STATUS = {
  pending: { key: '승인대기', en: 'Pending review' },
  submitted: { key: '승인대기', en: 'Pending review' },
  '승인대기': { key: '승인대기', en: 'Pending review' },
  approved: { key: '승인완료', en: 'Approved' },
  approval_complete: { key: '승인완료', en: 'Approved' },
  '승인완료': { key: '승인완료', en: 'Approved' },
  rejected: { key: '취소', label: '반려', en: 'Rejected' },
  '반려': { key: '취소', label: '반려', en: 'Rejected' },
  completed: { key: '완료', en: 'Completed' },
  '완료': { key: '완료', en: 'Completed' },
  cancelled: { key: '취소', en: 'Cancelled' },
  '취소': { key: '취소', en: 'Cancelled' },
};
const CANCELLED_APPLICATION = ['cancelled', 'canceled', '취소'];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ko-KR');
};

const StatusChip = ({ info, isKorean }) => {
  const colors = statusColors[info.key] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <Chip
      label={isKorean ? info.label || info.key : info.en}
      size="small"
      sx={{ backgroundColor: colors.bg, color: colors.text, fontWeight: 500, fontSize: '0.75rem', height: 24 }}
    />
  );
};

const ProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState(null);
  const [application, setApplication] = useState(null);

  useEffect(() => {
    const fetchProgram = async () => {
      setLoading(true);
      try {
        const response = await programsAPI.getById(id);
        const programData = apiObject(response.data, 'program');
        const userApplication = response.data?.userApplication || programData.userApplication || null;
        setProgram(programData.id ? programData : null);
        setApplication(userApplication && !CANCELLED_APPLICATION.includes(String(userApplication.status || '').toLowerCase()) ? userApplication : null);
      } catch {
        setProgram(null);
        setApplication(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProgram();
  }, [id]);

  if (loading) return <Box><Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} /><Skeleton variant="rectangular" height={400} /></Box>;

  if (!program) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{isKorean ? '해당 프로그램을 찾을 수 없습니다.' : 'This program could not be found.'}</Typography>
        <Button onClick={() => navigate('/programs')} sx={{ mt: 2 }}>{isKorean ? '프로그램 목록으로' : 'Back to programs'}</Button>
      </Box>
    );
  }

  const capacity = program.max_participants || 0;
  const current = program.current_participants || 0;
  const percent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
  const rawStatus = String(program.status || '').toLowerCase();
  const statusInfo = PROGRAM_STATUS[rawStatus] || PROGRAM_STATUS[program.status] || null;
  const recruitmentEnd = program.recruitment_end ? new Date(program.recruitment_end) : null;
  const recruitmentOver = Boolean(recruitmentEnd && !Number.isNaN(recruitmentEnd.getTime()) && recruitmentEnd.setHours(23, 59, 59, 999) < Date.now());
  const isClosed = CLOSED_STATUSES.includes(rawStatus) || CLOSED_STATUSES.includes(program.status) || recruitmentOver;
  const isFull = capacity > 0 && current >= capacity;
  const applicationInfo = application ? (APPLICATION_STATUS[String(application.status || 'pending').toLowerCase()] || APPLICATION_STATUS[application.status] || APPLICATION_STATUS.pending) : null;
  const applyLabel = application
    ? (isKorean ? '신청 완료' : 'Applied')
    : isClosed
      ? (isKorean ? '모집 마감' : 'Closed')
      : isFull
        ? (isKorean ? '정원 마감' : 'Full')
        : (isKorean ? '신청하기' : 'Apply');
  const title = (isKorean ? program.title_ko || program.title_en : program.title_en || program.title_ko) || program.title || '-';
  const description = (isKorean ? program.description_ko || program.description_en : program.description_en || program.description_ko) || program.description || '';

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/programs')} sx={{ mb: 2 }}>{isKorean ? '프로그램 목록으로' : 'Back to programs'}</Button>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {program.category && <CategoryBadge category={program.category} />}
                  {statusInfo && <StatusChip info={statusInfo} isKorean={isKorean} />}
                </Box>
                <Typography variant="h5" fontWeight={700}>{title}</Typography>
              </Box>
              <Divider sx={{ my: 3 }} />
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ display: 'flex', gap: 1 }}><CalendarIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '모집 기간' : 'Recruitment'}</Typography><Typography variant="body2">{formatDate(program.recruitment_start)} ~ {formatDate(program.recruitment_end)}</Typography></Box></Box></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ display: 'flex', gap: 1 }}><CalendarIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '운영 기간' : 'Program period'}</Typography><Typography variant="body2">{formatDate(program.program_start)} ~ {formatDate(program.program_end)}</Typography></Box></Box></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ display: 'flex', gap: 1 }}><LocationIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '장소' : 'Location'}</Typography><Typography variant="body2">{program.location || (isKorean ? '온라인' : 'Online')}</Typography></Box></Box></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Box sx={{ display: 'flex', gap: 1 }}><PersonIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '담당자' : 'Instructor'}</Typography><Typography variant="body2">{program.instructor_name || program.instructor_email || '-'}</Typography></Box></Box></Grid>
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{isKorean ? '설명' : 'Description'}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{description || (isKorean ? '등록된 설명이 없습니다.' : 'No description provided.')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{isKorean ? '신청 현황' : 'Application Status'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <GroupIcon color="action" />
                <Typography variant="body2">{isKorean ? `${current} / ${capacity || '-'}명` : `${current} / ${capacity || '-'} applicants`}</Typography>
              </Box>
              <Box sx={{ height: 8, backgroundColor: '#E5E5E5', borderRadius: 4, overflow: 'hidden', mb: 3 }}>
                <Box sx={{ height: '100%', width: `${percent}%`, backgroundColor: '#0047BA' }} />
              </Box>
              {application && (
                <Alert severity="success" sx={{ mb: 2, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <span>{isKorean ? '이미 신청한 프로그램입니다.' : 'You have already applied.'}</span>
                    {applicationInfo && <StatusChip info={applicationInfo} isKorean={isKorean} />}
                  </Box>
                  {(application.applied_at || application.created_at) && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {isKorean ? '신청일' : 'Applied on'}: {formatDate(application.applied_at || application.created_at)}
                    </Typography>
                  )}
                </Alert>
              )}
              <Button fullWidth variant="contained" size="large" disabled={Boolean(application) || isClosed || isFull} onClick={() => navigate(`/programs/${id}/apply`)}>
                {applyLabel}
              </Button>
              {application && (
                <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => navigate('/activities/applications')}>
                  {isKorean ? '나의 신청 내역 보기' : 'View my applications'}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProgramDetail;
