import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { apiArray, apiObject, jobsAPI, resumesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string' && value.trim()) return value.split(/\r?\n/).map((item) => item.replace(/^[-•\s]+/, '').trim()).filter(Boolean);
  return [];
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ko-KR');
};

const EMPLOYMENT_TYPES = {
  full_time: ['정규직', 'Full-time'],
  'full-time': ['정규직', 'Full-time'],
  part_time: ['시간제', 'Part-time'],
  'part-time': ['시간제', 'Part-time'],
  contract: ['계약직', 'Contract'],
  temporary: ['임시직', 'Temporary'],
  internship: ['인턴', 'Internship'],
  freelance: ['프리랜서', 'Freelance'],
  volunteer: ['자원봉사', 'Volunteer'],
};

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const response = await jobsAPI.getById(id);
        const nextJob = apiObject(response.data, 'job');
        setJob(nextJob.id ? nextJob : null);
        setBookmarked(Boolean(nextJob?.is_bookmarked));
        setApplied(Boolean(nextJob?.is_applied || nextJob?.has_applied));
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleBookmark = async () => {
    try {
      if (bookmarked) {
        await jobsAPI.removeBookmark(id);
        showSuccess(isKorean ? '저장한 채용에서 삭제했습니다.' : 'Removed from saved jobs.');
      } else {
        await jobsAPI.bookmark(id);
        showSuccess(isKorean ? '채용 정보를 저장했습니다.' : 'Saved job.');
      }
      setBookmarked((value) => !value);
    } catch {
      showError(isKorean ? '저장한 채용 정보를 업데이트하지 못했습니다.' : 'Unable to update saved jobs.');
    }
  };

  const handleApply = async () => {
    if (job.external_url) {
      window.open(job.external_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setApplyOpen(true);
    try {
      const response = await resumesAPI.getAll();
      const list = apiArray(response.data, 'resumes');
      setResumes(list);
      const primary = list.find((resume) => resume.is_primary) || list[0];
      setResumeId(primary ? String(primary.id) : '');
    } catch {
      setResumes([]);
    }
  };

  const submitApplication = async () => {
    setApplying(true);
    try {
      await jobsAPI.apply(id, { resume_id: resumeId || null });
      setApplied(true);
      setApplyOpen(false);
      showSuccess(isKorean ? '지원이 완료되었습니다.' : 'Your application has been submitted.');
    } catch (error) {
      const detail = `${error?.response?.data?.detail || ''} ${error?.response?.data?.error || ''}`;
      if (error?.response?.status === 409 || /duplicate|unique|already/i.test(detail)) {
        setApplied(true);
        setApplyOpen(false);
        showError(isKorean ? '이미 지원한 채용 공고입니다.' : 'You have already applied to this job.');
      } else {
        showError(isKorean ? '지원에 실패했습니다. 다시 시도해주세요.' : 'Failed to apply. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <Box><Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} /><Skeleton variant="rectangular" height={400} /></Box>;
  }

  if (!job) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{isKorean ? '해당 채용 정보를 찾을 수 없습니다.' : 'This job could not be found.'}</Typography>
        <Button onClick={() => navigate('/jobs')} sx={{ mt: 2 }}>{isKorean ? '채용 목록으로' : 'Back to jobs'}</Button>
      </Box>
    );
  }

  const description = (isKorean ? job.description_ko || job.description_en : job.description_en || job.description_ko) || job.description || '';
  const requirements = toList(job.requirements);
  const benefits = toList(job.benefits);
  const typeLabel = EMPLOYMENT_TYPES[String(job.employment_type || '').toLowerCase()];
  const employmentType = typeLabel ? (isKorean ? typeLabel[0] : typeLabel[1]) : (job.employment_type || '-');
  const deadline = job.deadline ? formatDate(job.deadline) : (isKorean ? '상시채용' : 'Open until filled');
  const deadlineDate = job.deadline ? new Date(job.deadline) : null;
  const isExpired = Boolean(deadlineDate && !Number.isNaN(deadlineDate.getTime()) && deadlineDate.setHours(23, 59, 59, 999) < Date.now());

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/jobs')} sx={{ mb: 2 }}>{isKorean ? '채용 목록으로' : 'Back to jobs'}</Button>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">{job.company_name || job.company || job.organization || (isKorean ? '기관' : 'Organization')}</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>{(isKorean ? job.title_ko || job.title_en : job.title_en || job.title_ko) || job.title || '-'}</Typography>
              </Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}><Box sx={{ display: 'flex', gap: 1 }}><LocationIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '장소' : 'Location'}</Typography><Typography variant="body2">{job.location || '-'}</Typography></Box></Box></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><Box sx={{ display: 'flex', gap: 1 }}><WorkIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '유형' : 'Type'}</Typography><Typography variant="body2">{employmentType}</Typography></Box></Box></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><Box sx={{ display: 'flex', gap: 1 }}><CalendarIcon color="action" fontSize="small" /><Box><Typography variant="caption" color="text.secondary">{isKorean ? '마감일' : 'Deadline'}</Typography><Typography variant="body2">{deadline}</Typography></Box></Box></Grid>
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{isKorean ? '상세 정보' : 'Details'}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, mb: 3 }}>{description || (isKorean ? '등록된 설명이 없습니다.' : 'No description provided.')}</Typography>
              {job.salary_range && (
                <Typography variant="body2" sx={{ mb: 3 }}><strong>{isKorean ? '급여' : 'Salary'}:</strong> {job.salary_range}</Typography>
              )}
              {requirements.length > 0 && (
                <>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{isKorean ? '지원 요건' : 'Requirements'}</Typography>
                  {requirements.map((item, index) => <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>- {item}</Typography>)}
                </>
              )}
              {benefits.length > 0 && (
                <>
                  <Typography variant="h6" fontWeight={600} sx={{ mt: 3, mb: 2 }}>{isKorean ? '혜택' : 'Benefits'}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{benefits.map((item, index) => <Chip key={index} label={item} variant="outlined" />)}</Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: 80 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{isKorean ? '지원' : 'Apply'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{isKorean ? '게시일' : 'Posted'}: {formatDate(job.posted_at || job.posted_date || job.created_at)}</Typography>
              <Typography variant="body2" color="error" sx={{ mb: 3 }}>{isKorean ? '마감일' : 'Deadline'}: {deadline}</Typography>
              <Button fullWidth variant="contained" size="large" onClick={handleApply} disabled={applied || isExpired} sx={{ mb: 2 }}>{applied ? (isKorean ? '지원 완료' : 'Applied') : isExpired ? (isKorean ? '마감됨' : 'Closed') : (isKorean ? '지원하기' : 'Apply')}</Button>
              <Button fullWidth variant="outlined" startIcon={bookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />} onClick={handleBookmark}>{bookmarked ? (isKorean ? '저장됨' : 'Saved') : (isKorean ? '채용 저장' : 'Save job')}</Button>
              {(job.contact_info || job.contact) && <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E5E5E5' }}><Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{isKorean ? '문의' : 'Contact'}: {job.contact_info || job.contact}</Typography></Box>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={applyOpen} onClose={() => !applying && setApplyOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{isKorean ? '채용 지원' : 'Apply for this job'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {isKorean
              ? `'${job.title_ko || job.title_en || ''}'에 지원하시겠습니까?`
              : `Apply for '${job.title_en || job.title_ko || ''}'?`}
          </DialogContentText>
          {resumes.length > 0 ? (
            <TextField select fullWidth size="small" label={isKorean ? '이력서 선택 (선택)' : 'Resume (optional)'} value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
              <MenuItem value="">{isKorean ? '이력서 없이 지원' : 'Apply without a resume'}</MenuItem>
              {resumes.map((resume) => (
                <MenuItem key={resume.id} value={String(resume.id)}>
                  {resume.title || (isKorean ? '제목 없는 이력서' : 'Untitled resume')}{resume.is_primary ? (isKorean ? ' (대표)' : ' (primary)') : ''}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {isKorean ? '등록된 이력서가 없습니다. 이력서 없이 지원하거나 이력서 관리에서 먼저 등록해 주세요.' : 'You have no resumes. You can apply without one or add one in Resume Manager first.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyOpen(false)} disabled={applying}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={submitApplication} disabled={applying} startIcon={applying ? <CircularProgress size={16} color="inherit" /> : null}>
            {isKorean ? '지원하기' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobDetail;
