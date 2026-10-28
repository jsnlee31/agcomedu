import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  PlayCircle as PlayIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { apiObject, coursesAPI, isPlainObject } from '../../services/api';
import CategoryBadge from '../../components/common/CategoryBadge';
import { useIsKorean } from '../../utils/language';

const getVideoType = (url) => {
  if (!url || typeof url !== 'string') return 'none';
  if (/youtube\.com\/(watch|shorts\/|embed\/|live\/)|youtube-nocookie\.com\/embed\/|youtu\.be\//i.test(url)) return 'youtube';
  if (/vimeo\.com\//i.test(url)) return 'vimeo';
  // Supabase storage URLs (/storage/v1/object/public/...) and .mp4/.webm/.mov files play in <video>
  return 'direct';
};

const getYouTubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/(?:shorts|embed|live)\/|youtube-nocookie\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
};

const getVimeoId = (url) => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
};

const VideoEmbed = ({ url, videoRef, onTimeUpdate, onEnded, title, errorText, openText }) => {
  const [failed, setFailed] = useState(false);
  const type = getVideoType(url);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (type === 'youtube') {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title={title || 'Video'} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
    }
  }

  if (type === 'vimeo') {
    const videoId = getVimeoId(url);
    if (videoId) {
      return <iframe src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0`} title={title || 'Video'} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
    }
  }

  if (failed) {
    return (
      <Box sx={{ textAlign: 'center', color: 'white', px: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>{errorText}</Typography>
        <Button variant="contained" href={url} target="_blank" rel="noopener noreferrer">{openText}</Button>
      </Box>
    );
  }

  return (
    <video
      key={url}
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      onError={() => setFailed(true)}
      src={url}
    />
  );
};

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const response = await coursesAPI.getById(id);
        const courseData = apiObject(response.data, 'course');
        if (!courseData.id) {
          setCourse(null);
          setLessons([]);
          setCurrentLesson(null);
          return;
        }
        const enrollment = isPlainObject(courseData.enrollment) ? courseData.enrollment : {};
        const alreadyCompleted = Boolean(
          courseData.is_completed ?? enrollment.is_completed ?? (Number(courseData.progress_percent ?? enrollment.progress_percent) >= 100)
        );
        let courseLessons = Array.isArray(courseData.lessons) ? courseData.lessons.filter(Boolean) : [];
        if (courseLessons.length === 0 && courseData.video_url) {
          courseLessons = [{
            id: `course-${courseData.id}`,
            title: courseData.title_ko || courseData.title_en || '',
            title_en: courseData.title_en,
            video_url: courseData.video_url,
            duration: courseData.duration_minutes,
            completed: alreadyCompleted,
          }];
        }
        setCourse({ ...courseData, is_completed: alreadyCompleted });
        setLessons(courseLessons);
        setCurrentLesson(courseLessons[0] || null);
      } catch {
        setCourse(null);
        setLessons([]);
        setCurrentLesson(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const handleLessonClick = (lesson) => {
    setCurrentLesson(lesson);
    setProgress(0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current?.duration) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const markLessonComplete = async (lesson) => {
    if (!lesson) return;
    const nextLessons = lessons.map((item) => (item.id === lesson.id ? { ...item, completed: true } : item));
    setLessons(nextLessons);
    setCurrentLesson((prev) => (prev && prev.id === lesson.id ? { ...prev, completed: true } : prev));
    const doneCount = nextLessons.filter((item) => item.completed).length;
    const percent = nextLessons.length > 0 ? Math.round((doneCount / nextLessons.length) * 100) : 100;
    try {
      await coursesAPI.updateProgress(id, { progress_percent: percent, is_completed: percent >= 100 });
    } catch {
      // Keep local completion visible when persistence fails.
    }
  };

  const handleVideoEnd = () => markLessonComplete(currentLesson);

  const backButton = (
    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/learning')} sx={{ mb: 2 }}>{isKorean ? '학습 자료로 돌아가기' : 'Back to learning'}</Button>
  );

  if (loading) {
    return <Box><Skeleton variant="rectangular" height={400} sx={{ mb: 3, maxWidth: '100%' }} /><Skeleton variant="rectangular" height={200} /></Box>;
  }

  if (!course) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{isKorean ? '해당 강의를 찾을 수 없습니다.' : 'This course could not be found.'}</Typography>
        <Button onClick={() => navigate('/learning')} sx={{ mt: 2 }}>{isKorean ? '학습 자료로 돌아가기' : 'Back to learning'}</Button>
      </Box>
    );
  }

  const courseTitle = (isKorean ? course.title_ko || course.title_en : course.title_en || course.title_ko) || '';
  const courseDescription = (isKorean ? course.description_ko || course.description_en : course.description_en || course.description_ko)
    || (isKorean ? '등록된 설명이 없습니다.' : 'No description provided.');
  const documentUrl = course.document_url || '';
  const hasVideo = lessons.some((lesson) => lesson?.video_url);
  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const overallProgress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : (course.is_completed ? 100 : 0);
  const videoType = currentLesson?.video_url ? getVideoType(currentLesson.video_url) : 'none';
  const isEmbedded = videoType === 'youtube' || videoType === 'vimeo';
  const lessonTitle = (lesson) => (isKorean ? lesson.title || lesson.title_en : lesson.title_en || lesson.title) || (isKorean ? '강의' : 'Lesson');
  const lessonDuration = (lesson) => {
    if (lesson.duration === undefined || lesson.duration === null || lesson.duration === '') return null;
    return Number.isFinite(Number(lesson.duration)) ? `${lesson.duration}${isKorean ? '분' : ' min'}` : String(lesson.duration);
  };

  const documentButton = documentUrl ? (
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      href={documentUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
    >
      {isKorean ? '강의 자료 열기/다운로드' : 'Open / download material'}
    </Button>
  ) : null;

  if (!hasVideo && !documentUrl) {
    return (
      <Box>
        {backButton}
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <PlayIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{courseTitle}</Typography>
            <Typography color="text.secondary">
              {isKorean ? '아직 등록된 영상이나 자료가 없습니다. 곧 준비될 예정이니 조금만 기다려 주세요.' : 'No video or material has been registered yet. Please check back soon.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {backButton}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ mb: 3 }}>
            {hasVideo ? (
              <>
                <Box sx={{ position: 'relative', backgroundColor: '#000', paddingTop: '56.25%' }}>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {currentLesson?.video_url ? (
                      <VideoEmbed
                        url={currentLesson.video_url}
                        videoRef={videoRef}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnd}
                        title={lessonTitle(currentLesson)}
                        errorText={isKorean ? '영상을 재생할 수 없습니다. 새 창에서 열어보세요.' : 'The video cannot be played here. Try opening it in a new tab.'}
                        openText={isKorean ? '새 창에서 열기' : 'Open in new tab'}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'white' }}><PlayIcon sx={{ fontSize: 80, mb: 2 }} /><Typography variant="h6">{isKorean ? '등록된 영상이 없습니다.' : 'No video source registered.'}</Typography></Box>
                    )}
                  </Box>
                </Box>
                {currentLesson && !isEmbedded && <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />}
              </>
            ) : (
              <Box sx={{ backgroundColor: '#F8F9FA', py: 6, textAlign: 'center' }}>
                <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">{isKorean ? '이 강의는 문서 자료로 제공됩니다.' : 'This course is provided as a document.'}</Typography>
              </Box>
            )}
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>{course.category && <CategoryBadge category={course.category} />}<Typography variant="caption" color="text.secondary">{course.instructor_name || course.instructor_email || '-'}</Typography></Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>{courseTitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{courseDescription}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TimeIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{course.duration_minutes ? `${course.duration_minutes}${isKorean ? '분' : ' min'}` : '-'}</Typography></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ViewIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{isKorean ? `조회수 ${Number(course.view_count || 0).toLocaleString()}회` : `${Number(course.view_count || 0).toLocaleString()} views`}</Typography></Box>
              </Box>
              {(documentButton || !hasVideo) && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {documentButton}
                  {!hasVideo && (
                    <Button variant="contained" startIcon={<CheckCircleIcon />} disabled={Boolean(course.is_completed)} onClick={async () => {
                      try {
                        await coursesAPI.updateProgress(id, { progress_percent: 100, is_completed: true });
                      } catch {
                        // ignore persistence failure
                      }
                      setCourse({ ...course, is_completed: true });
                    }}>
                      {course.is_completed ? (isKorean ? '학습 완료' : 'Completed') : (isKorean ? '학습 완료로 표시' : 'Mark as complete')}
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: 80 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{isKorean ? '강의 목록' : 'Lessons'}</Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="body2" color="text.secondary">{isKorean ? '진도율' : 'Progress'}</Typography><Typography variant="body2" fontWeight={600}>{overallProgress}%</Typography></Box>
                <LinearProgress variant="determinate" value={overallProgress} sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="caption" color="text.secondary">{completedCount} / {lessons.length} {isKorean ? '완료' : 'complete'}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <List disablePadding>
                {lessons.length === 0 ? <Typography color="text.secondary">{isKorean ? '등록된 강의 영상이 없습니다.' : 'No lessons are available.'}</Typography> : lessons.map((lesson) => (
                  <ListItem key={lesson.id} disablePadding>
                    <ListItemButton selected={currentLesson?.id === lesson.id} onClick={() => handleLessonClick(lesson)} sx={{ borderRadius: 1, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>{lesson.completed ? <CheckCircleIcon color="success" fontSize="small" /> : <PlayIcon color="action" fontSize="small" />}</ListItemIcon>
                      <ListItemText primary={<Typography variant="body2" fontWeight={currentLesson?.id === lesson.id ? 600 : 400}>{lessonTitle(lesson)}</Typography>} secondary={lessonDuration(lesson)} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              {lessons.length > 0 && currentLesson && !currentLesson.completed && (
                <Button fullWidth variant="outlined" startIcon={<CheckCircleIcon />} sx={{ mt: 2 }} onClick={() => markLessonComplete(currentLesson)}>
                  {isKorean ? '학습 완료로 표시' : 'Mark as complete'}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VideoPlayer;
