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
  MenuItem,
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
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { apiArray, programsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';
import { useAuth } from '../../contexts/AuthContext';

const emptyForm = {
  title_ko: '',
  title_en: '',
  category: '',
  status: 'open',
  description_ko: '',
  description_en: '',
  recruitment_start: '',
  recruitment_end: '',
  program_start: '',
  program_end: '',
  max_participants: 30,
  location: '',
  requirements: '',
};

const text = (isKorean, ko, en) => (isKorean ? ko : en);

// Status values understood by backend routes/programs.js (closed statuses
// block applications); legacy Korean values are still labelled correctly.
const STATUS_OPTIONS = ['open', 'closed', 'completed', 'cancelled'];
const STATUS_LABELS = {
  open: ['모집중', 'Open'],
  closed: ['모집 마감', 'Closed'],
  completed: ['종료', 'Completed'],
  cancelled: ['취소', 'Cancelled'],
  모집중: ['모집중', 'Open'],
  마감예정: ['마감 예정', 'Closing soon'],
  진행중: ['진행중', 'In progress'],
  종료: ['종료', 'Completed'],
};
const STATUS_COLORS = { open: 'success', 모집중: 'success', 진행중: 'info', 마감예정: 'warning', closed: 'default', completed: 'default', 종료: 'default', cancelled: 'error' };

const statusLabel = (isKorean, status) => {
  const label = STATUS_LABELS[status];
  if (!label) return status || '-';
  return isKorean ? label[0] : label[1];
};

const toDateInput = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const ProgramManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useAuth();
  const canDelete = isAdmin();
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await programsAPI.getAll({ limit: 100 });
      setPrograms(apiArray(response.data, 'programs'));
    } catch (error) {
      setPrograms([]);
      showError(error.response?.data?.detail || error.response?.data?.error || text(isKorean, '프로그램을 불러오지 못했습니다.', 'Unable to load programs.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (program) => {
    setEditing(program);
    setForm({
      ...emptyForm,
      title_ko: program.title_ko || '',
      title_en: program.title_en || '',
      category: program.category || '',
      status: program.status || 'open',
      description_ko: program.description_ko || '',
      description_en: program.description_en || '',
      recruitment_start: toDateInput(program.recruitment_start),
      recruitment_end: toDateInput(program.recruitment_end),
      program_start: toDateInput(program.program_start),
      program_end: toDateInput(program.program_end),
      max_participants: program.max_participants || 30,
      location: program.location || '',
      requirements: program.requirements || '',
    });
    setDialogOpen(true);
  };

  const cleanPayload = () => {
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => {
        const trimmed = typeof value === 'string' ? value.trim() : value;
        return [key, trimmed === '' ? null : trimmed];
      })
    );
    const max = Number(payload.max_participants);
    payload.max_participants = Number.isFinite(max) && max > 0 ? Math.round(max) : null;
    return payload;
  };

  const saveProgram = async () => {
    if (!form.title_ko.trim()) {
      showError(text(isKorean, '프로그램 제목을 입력하세요.', 'Program title is required.'));
      return;
    }
    if (form.recruitment_start && form.recruitment_end && form.recruitment_end < form.recruitment_start) {
      showError(text(isKorean, '모집 종료일은 시작일 이후여야 합니다.', 'Recruitment end must be after the start date.'));
      return;
    }
    if (form.program_start && form.program_end && form.program_end < form.program_start) {
      showError(text(isKorean, '운영 종료일은 시작일 이후여야 합니다.', 'Program end must be after the start date.'));
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await programsAPI.update(editing.id, cleanPayload());
        showSuccess(text(isKorean, '프로그램이 수정되었습니다.', 'Program updated.'));
      } else {
        await programsAPI.create(cleanPayload());
        showSuccess(text(isKorean, '프로그램이 생성되었습니다.', 'Program created.'));
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || text(isKorean, '프로그램을 저장하지 못했습니다.', 'Unable to save program.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteProgram = async (program) => {
    const title = program.title_ko || program.title_en || '';
    if (!window.confirm(text(isKorean, `'${title}' 프로그램을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`, `Delete '${title}'? This cannot be undone.`))) return;
    try {
      await programsAPI.delete(program.id);
      showSuccess(text(isKorean, '프로그램이 삭제되었습니다.', 'Program deleted.'));
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || text(isKorean, '프로그램을 삭제하지 못했습니다.', 'Unable to delete program.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{text(isKorean, '프로그램 관리', 'Program Management')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {text(isKorean, '프로그램을 생성, 수정, 삭제합니다.', 'Create, edit, and delete programs.')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{text(isKorean, '새로고침', 'Refresh')}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{text(isKorean, '프로그램 추가', 'Add Program')}</Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{text(isKorean, '제목', 'Title')}</TableCell>
                  <TableCell>{text(isKorean, '분류', 'Category')}</TableCell>
                  <TableCell>{text(isKorean, '상태', 'Status')}</TableCell>
                  <TableCell>{text(isKorean, '모집 기간', 'Recruitment')}</TableCell>
                  <TableCell>{text(isKorean, '정원', 'Capacity')}</TableCell>
                  <TableCell align="right">{text(isKorean, '작업', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id} hover>
                    <TableCell>{(isKorean ? program.title_ko || program.title_en : program.title_en || program.title_ko) || '-'}</TableCell>
                    <TableCell><Chip size="small" label={program.category || '-'} /></TableCell>
                    <TableCell><Chip size="small" variant="outlined" color={STATUS_COLORS[program.status] || 'default'} label={statusLabel(isKorean, program.status)} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{toDateInput(program.recruitment_start) || '-'} ~ {toDateInput(program.recruitment_end) || '-'}</TableCell>
                    <TableCell>{Number(program.current_participants) || 0}/{program.max_participants || '-'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => openEdit(program)}>{text(isKorean, '수정', 'Edit')}</Button>
                      {canDelete && (
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteProgram(program)}>
                          {text(isKorean, '삭제', 'Delete')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {programs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      {text(isKorean, '등록된 프로그램이 없습니다.', 'No programs are available.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editing ? text(isKorean, '프로그램 수정', 'Edit Program') : text(isKorean, '프로그램 추가', 'Add Program')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label={text(isKorean, '제목', 'Title')} value={form.title_ko} onChange={(e) => setForm({ ...form, title_ko: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={text(isKorean, '영문 제목', 'English title')} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={text(isKorean, '분류', 'Category')} placeholder={text(isKorean, '예: 훈련, 교육, 컨디셔닝', 'e.g. Training, Education')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={text(isKorean, '상태', 'Status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {(STATUS_OPTIONS.includes(form.status) || !form.status ? STATUS_OPTIONS : [...STATUS_OPTIONS, form.status]).map((status) => (
                  <MenuItem key={status} value={status}>{statusLabel(isKorean, status)}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={3} label={text(isKorean, '설명', 'Description')} value={form.description_ko} onChange={(e) => setForm({ ...form, description_ko: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={2} label={text(isKorean, '영문 설명', 'English description')} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" label={text(isKorean, '모집 시작', 'Recruitment start')} value={form.recruitment_start} onChange={(e) => setForm({ ...form, recruitment_start: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" label={text(isKorean, '모집 종료', 'Recruitment end')} value={form.recruitment_end} onChange={(e) => setForm({ ...form, recruitment_end: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" label={text(isKorean, '운영 시작', 'Program start')} value={form.program_start} onChange={(e) => setForm({ ...form, program_start: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="date" label={text(isKorean, '운영 종료', 'Program end')} value={form.program_end} onChange={(e) => setForm({ ...form, program_end: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" inputProps={{ min: 1 }} label={text(isKorean, '정원', 'Capacity')} value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={text(isKorean, '장소', 'Location')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={2} label={text(isKorean, '요건', 'Requirements')} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{text(isKorean, '취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={saveProgram} disabled={saving}>{saving ? text(isKorean, '저장 중...', 'Saving...') : text(isKorean, '저장', 'Save')}</Button>

        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgramManagement;
