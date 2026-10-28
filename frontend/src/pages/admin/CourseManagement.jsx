import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiArray, coursesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';
import FileUploadButton from '../../components/common/FileUploadButton';

const MAX_VIDEO_SIZE_MB = 500;
const CATEGORY_LABELS = {
  Sports: '스포츠',
  'Strength Training': '근력 훈련',
  Nutrition: '영양',
  'Mental Coaching': '멘탈 코칭',
  Rehabilitation: '재활',
  'Team Building': '팀 빌딩',
  'Technical Skills': '기술 훈련',
};
const TYPE_LABELS = { video: '영상', document: '문서', quiz: '퀴즈' };
const CATEGORIES = [
  'Sports',
  'Strength Training',
  'Nutrition',
  'Mental Coaching',
  'Rehabilitation',
  'Team Building',
  'Technical Skills',
];

const emptyForm = {
  title_ko: '',
  title_en: '',
  category: 'Sports',
  description_ko: '',
  description_en: '',
  type: 'video',
  video_url: '',
  document_url: '',
  thumbnail_url: '',
  duration_minutes: '',
  file_size: '',
  is_featured: false,
};

const text = (isKorean, ko, en) => (isKorean ? ko : en);

const CourseManagement = () => {
  const isKorean = useIsKorean();
  const { showSuccess, showError } = useNotification();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await coursesAPI.getAll({ limit: 100 });
      setCourses(apiArray(response.data, 'courses'));
    } catch (error) {
      setCourses([]);
      showError(error.response?.data?.detail || error.response?.data?.error || text(isKorean, '강의를 불러오지 못했습니다.', 'Unable to load courses.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => {
    fetchCourses();
    const interval = setInterval(fetchCourses, 30000);
    return () => clearInterval(interval);
  }, [fetchCourses]);

  const openCreate = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setForm({
      ...emptyForm,
      title_ko: course.title_ko || '',
      title_en: course.title_en || '',
      category: course.category || 'Sports',
      description_ko: course.description_ko || '',
      description_en: course.description_en || '',
      type: course.type || 'video',
      video_url: course.video_url || '',
      document_url: course.document_url || '',
      thumbnail_url: course.thumbnail_url || '',
      duration_minutes: course.duration_minutes || '',
      file_size: course.file_size || '',
      is_featured: Boolean(course.is_featured),
    });
    setDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!form.title_ko.trim()) {
      showError(text(isKorean, '강의 제목을 입력하세요.', 'Course title is required.'));
      return;
    }

    const payload = Object.fromEntries(
      Object.entries({
        ...form,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      }).map(([key, value]) => [key, value === '' ? null : value])
    );

    try {
      if (editingCourse) {
        await coursesAPI.update(editingCourse.id, payload);
        showSuccess(text(isKorean, '강의가 수정되었습니다.', 'Course updated.'));
      } else {
        await coursesAPI.create(payload);
        showSuccess(text(isKorean, '강의가 생성되었습니다.', 'Course created.'));
      }
      setDialogOpen(false);
      await fetchCourses();
    } catch (error) {
      showError(error.response?.data?.detail || error.response?.data?.error || text(isKorean, '강의를 저장하지 못했습니다.', 'Unable to save course.'));
    }
  };

  const deleteCourse = async (course) => {
    if (!window.confirm(text(isKorean, `'${course.title_ko || course.title_en}' 강의를 삭제할까요?`, `Delete '${course.title_en || course.title_ko}'?`))) return;
    try {
      await coursesAPI.delete(course.id);
      showSuccess(text(isKorean, '강의가 삭제되었습니다.', 'Course deleted.'));
      await fetchCourses();
    } catch (error) {
      showError(error.response?.data?.detail || error.response?.data?.error || text(isKorean, '강의를 삭제하지 못했습니다.', 'Unable to delete course.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{text(isKorean, '강의 관리', 'Course Management')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {text(isKorean, '선수단 학습 콘텐츠를 생성, 수정, 삭제합니다.', 'Create, edit, and delete learning content.')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCourses}>{text(isKorean, '새로고침', 'Refresh')}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{text(isKorean, '강의 추가', 'Add Course')}</Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{text(isKorean, '제목', 'Title')}</TableCell>
                  <TableCell>{text(isKorean, '분류', 'Category')}</TableCell>
                  <TableCell>{text(isKorean, '유형', 'Type')}</TableCell>
                  <TableCell>{text(isKorean, '등록자', 'Registrants')}</TableCell>
                  <TableCell>{text(isKorean, '조회', 'Views')}</TableCell>
                  <TableCell>{text(isKorean, '다운로드', 'Downloads')}</TableCell>
                  <TableCell align="right">{text(isKorean, '작업', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id} hover>
                    <TableCell>{course.title_ko || course.title_en || '-'}</TableCell>
                    <TableCell><Chip size="small" label={(isKorean && CATEGORY_LABELS[course.category]) || course.category || '-'} /></TableCell>
                    <TableCell>{(isKorean && TYPE_LABELS[course.type]) || course.type || '-'}</TableCell>
                    <TableCell>{course.enrollment_count || 0}</TableCell>
                    <TableCell>{course.view_count || 0}</TableCell>
                    <TableCell>{course.download_count || 0}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEdit(course)}>{text(isKorean, '수정', 'Edit')}</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteCourse(course)}>
                        {text(isKorean, '삭제', 'Delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      {text(isKorean, '등록된 강의가 없습니다.', 'No courses are available.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editingCourse ? text(isKorean, '강의 수정', 'Edit Course') : text(isKorean, '강의 추가', 'Add Course')}</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label={text(isKorean, '강의 제목', 'Course title')} value={form.title_ko} onChange={(event) => setForm({ ...form, title_ko: event.target.value })} required />
          <TextField label={text(isKorean, '영문 제목', 'English title')} value={form.title_en} onChange={(event) => setForm({ ...form, title_en: event.target.value })} />
          <FormControl>
            <InputLabel>{text(isKorean, '분류', 'Category')}</InputLabel>
            <Select label={text(isKorean, '분류', 'Category')} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {CATEGORIES.map((category) => <MenuItem key={category} value={category}>{isKorean ? CATEGORY_LABELS[category] : category}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label={text(isKorean, '설명', 'Description')} multiline rows={4} value={form.description_ko} onChange={(event) => setForm({ ...form, description_ko: event.target.value })} />
          <FormControl>
            <InputLabel>{text(isKorean, '유형', 'Type')}</InputLabel>
            <Select label={text(isKorean, '유형', 'Type')} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {Object.keys(TYPE_LABELS).map((type) => <MenuItem key={type} value={type}>{isKorean ? TYPE_LABELS[type] : type}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField fullWidth label={text(isKorean, '영상 URL (YouTube · Vimeo · MP4)', 'Video URL (YouTube · Vimeo · MP4)')} value={form.video_url} onChange={(event) => setForm({ ...form, video_url: event.target.value })} helperText={form.file_size ? text(isKorean, `업로드한 파일 크기: ${form.file_size}`, `Uploaded file size: ${form.file_size}`) : text(isKorean, '링크를 입력하거나 영상 파일을 직접 업로드하세요.', 'Paste a link or upload a video file.')} />
            <FileUploadButton
              accept="video/*"
              folder="videos"
              maxSizeMB={MAX_VIDEO_SIZE_MB}
              label={text(isKorean, '영상 업로드', 'Upload video')}
              onUploaded={(url, file) => setForm((current) => ({ ...current, video_url: url, file_size: file.size, type: 'video' }))}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField fullWidth label={text(isKorean, '문서 URL', 'Document URL')} value={form.document_url} onChange={(event) => setForm({ ...form, document_url: event.target.value })} />
            <FileUploadButton
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.hwp,.txt"
              folder="documents"
              maxSizeMB={100}
              label={text(isKorean, '문서 업로드', 'Upload document')}
              onUploaded={(url, file) => setForm((current) => ({ ...current, document_url: url, file_size: current.file_size || file.size }))}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField fullWidth label={text(isKorean, '썸네일 이미지 URL', 'Thumbnail URL')} value={form.thumbnail_url} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} />
            <FileUploadButton
              accept="image/*"
              folder="images"
              maxSizeMB={10}
              label={text(isKorean, '이미지 업로드', 'Upload image')}
              onUploaded={(url) => setForm((current) => ({ ...current, thumbnail_url: url }))}
            />
          </Box>
          <TextField label={text(isKorean, '강의 시간(분)', 'Duration minutes')} type="number" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{text(isKorean, '취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={saveCourse}>{text(isKorean, '저장', 'Save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;
