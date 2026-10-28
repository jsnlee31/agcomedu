import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Grid, IconButton, Skeleton, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Bookmark as BookmarkIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { apiArray, jobsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const Favorites = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const response = await jobsAPI.getBookmarks();
        setFavorites(apiArray(response.data, 'bookmarks'));
      } catch {
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const handleRemove = async (id) => {
    try {
      await jobsAPI.removeBookmark(id);
      setFavorites((items) => items.filter((item) => item.id !== id));
      showSuccess(isKorean ? '저장한 채용에서 삭제했습니다.' : 'Removed from saved jobs.');
    } catch {
      showError(isKorean ? '저장한 채용을 삭제하지 못했습니다.' : 'Unable to remove saved job.');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/jobs')} sx={{ mb: 2 }}>{isKorean ? '채용 목록으로' : 'Back to jobs'}</Button>
        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkIcon color="primary" />
          {isKorean ? '저장한 채용' : 'Saved Jobs'}
        </Typography>
      </Box>

      {loading ? (
        <Grid container spacing={2}>{[1, 2, 3].map((item) => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item}><Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} /></Grid>)}</Grid>
      ) : favorites.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 8 }}><BookmarkIcon sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} /><Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>{isKorean ? '저장한 채용이 없습니다.' : 'No saved jobs are available.'}</Typography><Button variant="contained" onClick={() => navigate('/jobs')}>{isKorean ? '채용 둘러보기' : 'Browse jobs'}</Button></CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {favorites.map((job) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={job.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(`/jobs/${job.id}`)}>
                      <Typography variant="caption" color="text.secondary">{job.company_name || job.company || job.organization || '-'}</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{(isKorean ? job.title_ko || job.title_en : job.title_en || job.title_ko) || job.title || job.position || '-'}</Typography>
                      <Typography variant="body2" color="text.secondary">{[job.location, job.employment_type].filter(Boolean).join(' | ') || '-'}</Typography>
                      <Typography variant="caption" color="error">{isKorean ? '마감일' : 'Deadline'}: {job.deadline ? new Date(job.deadline).toLocaleDateString('ko-KR') : (isKorean ? '상시채용' : 'Open')}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemove(job.id)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                  <Button fullWidth variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate(`/jobs/${job.id}`)}>{isKorean ? '상세 보기' : 'View details'}</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Favorites;
