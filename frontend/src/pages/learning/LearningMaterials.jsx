import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { Download as DownloadIcon, PlayCircle as PlayIcon } from '@mui/icons-material';
import { apiArray, coursesAPI } from '../../services/api';
import { categoryLabel } from '../../components/common/CategoryBadge';
import { useIsKorean } from '../../utils/language';

const LearningMaterials = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isKorean = useIsKorean();
  const isDownloads = location.pathname.startsWith('/learning/downloads');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await coursesAPI.getAll({ limit: 100 });
        setCourses(apiArray(response.data, 'courses'));
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleCourses = isDownloads ? courses.filter((course) => course?.document_url) : courses;
  const title = isDownloads ? (isKorean ? '자료 다운로드' : 'Downloads') : (isKorean ? '학습 자료' : 'Learning Materials');
  const subtitle = isDownloads
    ? (isKorean ? '강의 교재와 참고 자료를 내려받을 수 있습니다.' : 'Download course handouts and reference materials.')
    : (isKorean ? '다양한 교육 영상과 자료로 학습해 보세요.' : 'Learn with training videos and materials.');
  const emptyText = isDownloads
    ? (isKorean ? '다운로드할 수 있는 자료가 없습니다.' : 'No downloadable materials are available.')
    : (isKorean ? '등록된 학습 자료가 없습니다.' : 'No learning materials are available.');

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Typography variant="h5" fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary">{subtitle}</Typography></Box>
      {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
        <Grid container spacing={2}>
          {visibleCourses.map((course) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => navigate(`/learning/${course.id}`)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700}>{(isKorean ? course.title_ko || course.title_en : course.title_en || course.title_ko) || '-'}</Typography>
                    <Chip sx={{ my: 1 }} size="small" label={categoryLabel(course.category, isKorean) || (course.type === 'document' ? (isKorean ? '문서' : 'Document') : (isKorean ? '강의' : 'Course'))} />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{isKorean ? `${course.enrollment_count || 0}명 수강` : `${course.enrollment_count || 0} registrants`}{course.duration_minutes ? ` · ${course.duration_minutes}${isKorean ? '분' : ' min'}` : ''}</Typography>
                    <Typography variant="body2" color="text.secondary">{(isKorean ? course.description_ko || course.description_en : course.description_en || course.description_ko) || (isKorean ? '등록된 설명이 없습니다.' : 'No description provided.')}</Typography>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 2, pb: 2 }}>
                  <Button variant="contained" startIcon={<PlayIcon />} onClick={() => navigate(`/learning/${course.id}`)}>{isKorean ? '열기' : 'Open'}</Button>
                  {course.document_url && (
                    <Button variant="outlined" startIcon={<DownloadIcon />} href={course.document_url} target="_blank" rel="noopener noreferrer" download>
                      {isKorean ? '자료 다운로드' : 'Download'}
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
          {visibleCourses.length === 0 && <Grid size={12}><Card><CardContent><Typography align="center" color="text.secondary">{emptyText}</Typography></CardContent></Card></Grid>}
        </Grid>
      )}
    </Box>
  );
};

export default LearningMaterials;
