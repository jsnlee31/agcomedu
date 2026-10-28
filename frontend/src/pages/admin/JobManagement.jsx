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
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiArray, jobsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const toDateInput = (value) => {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Blank optional fields are sent as null so they are cleared/stored as NULL.
const toPayload = (form) => Object.fromEntries(
  Object.entries(form).map(([key, value]) => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    return [key, trimmed === '' || trimmed === undefined ? null : trimmed];
  })
);

const emptyForm = {
  company_name: '',
  title_ko: '',
  title_en: '',
  description_ko: '',
  description_en: '',
  category: '',
  employment_type: '',
  location: '',
  salary_range: '',
  requirements: '',
  benefits: '',
  contact_info: '',
  external_url: '',
  deadline: '',
};

const JobManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await jobsAPI.getAll();
      setJobs(apiArray(response.data, 'jobs'));
    } catch (error) {
      setJobs([]);
      showError(error.response?.data?.error || (isKorean ? '채용 정보를 불러오지 못했습니다.' : 'Unable to load jobs.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingJob(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, job[key] ?? ''])),
      deadline: toDateInput(job.deadline),
    });
    setDialogOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveJob = async () => {
    if (!form.company_name.trim() || !form.title_ko.trim()) {
      showError(isKorean ? '회사/기관명과 제목을 입력해 주세요.' : 'Company and Korean title are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editingJob) {
        await jobsAPI.update(editingJob.id, payload);
        showSuccess(isKorean ? '공고가 수정되었습니다.' : 'Job posting updated.');
      } else {
        await jobsAPI.create(payload);
        showSuccess(isKorean ? '공고가 생성되었습니다.' : 'Job posting created.');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? '공고를 저장하지 못했습니다.' : 'Unable to save job posting.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (job) => {
    const title = job.title_ko || job.title_en || job.title || '';
    if (!window.confirm(isKorean ? `'${title}' 공고를 삭제(비활성화)하시겠습니까?` : `Delete (deactivate) '${title}'?`)) return;
    try {
      await jobsAPI.delete(job.id);
      showSuccess(isKorean ? '공고가 비활성화되었습니다.' : 'Job posting deactivated.');
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? '공고를 삭제하지 못했습니다.' : 'Unable to delete job posting.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>{isKorean ? '채용 공고 관리' : 'Job Management'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isKorean ? '채용/기회 공고를 생성하고 관리합니다.' : 'Create and manage job and opportunity postings.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{isKorean ? '새로고침' : 'Refresh'}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{isKorean ? '공고 추가' : 'Add posting'}</Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{isKorean ? '회사/기관' : 'Company'}</TableCell>
                  <TableCell>{isKorean ? '제목' : 'Title'}</TableCell>
                  <TableCell>{isKorean ? '장소' : 'Location'}</TableCell>
                  <TableCell>{isKorean ? '유형' : 'Type'}</TableCell>
                  <TableCell>{isKorean ? '마감일' : 'Deadline'}</TableCell>
                  <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.company_name || job.company || '-'}</TableCell>
                    <TableCell>{(isKorean ? job.title_ko || job.title_en : job.title_en || job.title_ko) || job.title || '-'}</TableCell>
                    <TableCell>{job.location || '-'}</TableCell>
                    <TableCell><Chip size="small" label={job.employment_type || '-'} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{toDateInput(job.deadline) || '-'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" aria-label={isKorean ? '수정' : 'Edit'} title={isKorean ? '수정' : 'Edit'} onClick={() => openEdit(job)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" aria-label={isKorean ? '삭제' : 'Delete'} title={isKorean ? '삭제' : 'Delete'} onClick={() => deleteJob(job)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      {isKorean ? '등록된 채용 정보가 없습니다.' : 'No jobs are available.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editingJob ? (isKorean ? '공고 수정' : 'Edit posting') : (isKorean ? '공고 추가' : 'Add posting')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label={isKorean ? '회사/기관명' : 'Company'} value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label={isKorean ? '제목' : 'Korean title'} value={form.title_ko} onChange={(e) => updateField('title_ko', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '영문 제목' : 'English title'} value={form.title_en} onChange={(e) => updateField('title_en', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '분야' : 'Category'} value={form.category} onChange={(e) => updateField('category', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '고용 유형' : 'Employment type'} value={form.employment_type} onChange={(e) => updateField('employment_type', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '장소' : 'Location'} value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '급여/조건' : 'Salary / terms'} value={form.salary_range} onChange={(e) => updateField('salary_range', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" label={isKorean ? '마감일' : 'Deadline'} value={form.deadline} onChange={(e) => updateField('deadline', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={4} label={isKorean ? '설명' : 'Description'} value={form.description_ko} onChange={(e) => updateField('description_ko', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={3} label={isKorean ? '자격 요건' : 'Requirements'} value={form.requirements} onChange={(e) => updateField('requirements', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={2} label={isKorean ? '혜택' : 'Benefits'} value={form.benefits} onChange={(e) => updateField('benefits', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '연락처' : 'Contact'} value={form.contact_info} onChange={(e) => updateField('contact_info', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={isKorean ? '외부 링크(URL)' : 'URL'} value={form.external_url} onChange={(e) => updateField('external_url', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={saveJob} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobManagement;
