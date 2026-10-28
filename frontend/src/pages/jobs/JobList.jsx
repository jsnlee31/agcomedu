import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, TextField, Typography } from '@mui/material';
import { apiArray, jobsAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const JobList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRecommendations = location.pathname.startsWith('/jobs/recommendations');
  const isKorean = useIsKorean();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = isRecommendations ? await jobsAPI.getRecommendations() : await jobsAPI.getAll();
        setJobs(apiArray(response.data, 'jobs'));
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isRecommendations]);

  const filtered = jobs.filter((job) => {
    const text = `${job.company_name || job.company || ''} ${job.title_ko || ''} ${job.title_en || ''} ${job.title || ''} ${job.location || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Typography variant="h5" fontWeight={700}>{isRecommendations ? (isKorean ? '추천 채용' : 'Recommended Jobs') : (isKorean ? '채용 정보' : 'Jobs')}</Typography><Typography variant="body2" color="text.secondary">{isKorean ? '선수단과 관련된 채용 및 지원 기회를 확인하세요.' : 'Explore opportunities for the delegation community.'}</Typography></Box>
      <TextField fullWidth size="small" label={isKorean ? '채용 검색' : 'Search jobs'} value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {filtered.map((job) => <Grid size={{ xs: 12, md: 6 }} key={job.id}><Card sx={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${job.id}`)}><CardContent><Typography variant="caption" color="text.secondary">{job.company_name || job.company || '-'}</Typography><Typography variant="h6" fontWeight={700}>{(isKorean ? job.title_ko || job.title_en : job.title_en || job.title_ko) || job.title || '-'}</Typography><Chip sx={{ mt: 1 }} size="small" label={job.location || (isKorean ? '장소 미정' : 'Location TBD')} /></CardContent></Card></Grid>)}
          {filtered.length === 0 && <Grid size={12}><Card><CardContent><Typography align="center" color="text.secondary">{isKorean ? '등록된 채용 정보가 없습니다.' : 'No jobs are available yet.'}</Typography></CardContent></Card></Grid>}
        </Grid>
      )}
    </Box>
  );
};

export default JobList;
