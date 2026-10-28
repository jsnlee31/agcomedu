import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import api, { apiArray, consultationsAPI, usersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

// Values stored in the database are Korean; English is a display label only.
const METHOD_OPTIONS = [
  { value: '온라인', en: 'Online' },
  { value: '오프라인', en: 'In person' },
  { value: '전화', en: 'Phone' },
];
const STATUS_OPTIONS = [
  { value: '예약됨', en: 'Scheduled', color: 'primary' },
  { value: '완료', en: 'Completed', color: 'success' },
  { value: '취소', en: 'Cancelled', color: 'default' },
  { value: '노쇼', en: 'No-show', color: 'warning' },
];
const LEGACY_VALUES = {
  online: '온라인', offline: '오프라인', phone: '전화',
  scheduled: '예약됨', pending: '예약됨', completed: '완료', cancelled: '취소', canceled: '취소', no_show: '노쇼',
};
const normalizeValue = (value, fallback) => {
  if (!value) return fallback;
  return LEGACY_VALUES[String(value).toLowerCase()] || value;
};

const CONSULTANT_ROLES = ['admin', 'instructor', 'hr_manager'];

const emptyForm = {
  user_id: '',
  consultant_id: '',
  scheduled_at: '',
  duration_minutes: 30,
  topic: '',
  notes: '',
  method: '온라인',
  status: '예약됨',
};

// datetime-local inputs work in local time; never go through toISOString()
// here, which would shift the value to UTC.
const toLocalInput = (value) => {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DDTHH:mm') : '';
};

const ConsultationManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const optionLabel = (options, value) => {
    const option = options.find((item) => item.value === value);
    if (!option) return value || '-';
    return isKorean ? option.value : option.en;
  };
  const errorMessage = (error, ko, en) => error?.response?.data?.error || error?.response?.data?.detail || (isKorean ? ko : en);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionResponse, userResponse] = await Promise.all([
        api.get('/consultations/all', { params: { limit: 200 } }),
        usersAPI.getAll({ limit: 200 }),
      ]);
      setSessions(apiArray(sessionResponse.data, 'consultations'));
      setUsers(apiArray(userResponse.data, 'users'));
    } catch (error) {
      setSessions([]);
      showError(error?.response?.data?.error || (isKorean ? '상담 정보를 불러오지 못했습니다.' : 'Unable to load consultations.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const consultants = useMemo(
    () => users.filter((user) => CONSULTANT_ROLES.includes(user.role) && user.status !== 'inactive'),
    [users]
  );

  const athletes = useMemo(
    () => users.filter((user) => !CONSULTANT_ROLES.includes(user.role) && user.status !== 'inactive'),
    [users]
  );

  const userName = (user) => (isKorean ? user.name_ko || user.name_en : user.name_en || user.name_ko) || user.email;

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      user_id: athletes[0]?.id || '',
      consultant_id: consultants[0]?.id || '',
      scheduled_at: dayjs().add(1, 'day').minute(0).second(0).format('YYYY-MM-DDTHH:mm'),
    });
    setDialogOpen(true);
  };

  const openEdit = (session) => {
    setEditing(session);
    setForm({
      ...emptyForm,
      user_id: session.user_id || '',
      consultant_id: session.consultant_id || '',
      scheduled_at: toLocalInput(session.scheduled_at),
      duration_minutes: session.duration_minutes || 30,
      topic: session.topic || '',
      notes: session.notes || '',
      method: normalizeValue(session.method, '온라인'),
      status: normalizeValue(session.status, '예약됨'),
    });
    setDialogOpen(true);
  };

  const saveSession = async () => {
    if (!form.user_id || !form.consultant_id || !form.scheduled_at) {
      showError(isKorean ? '대상자, 상담자, 일시를 선택하세요.' : 'User, consultant, and date/time are required.');
      return;
    }
    const scheduled = dayjs(form.scheduled_at);
    if (!scheduled.isValid()) {
      showError(isKorean ? '상담 일시가 올바르지 않습니다.' : 'Invalid date and time.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await consultationsAPI.update(editing.id, {
          status: form.status,
          method: form.method,
          notes: form.notes.trim() || null,
        });
        showSuccess(isKorean ? '상담이 수정되었습니다.' : 'Consultation updated.');
      } else {
        await consultationsAPI.book({
          user_id: form.user_id,
          consultant_id: form.consultant_id,
          scheduled_at: scheduled.toDate().toISOString(),
          duration_minutes: Number(form.duration_minutes) || 30,
          topic: form.topic.trim() || (isKorean ? '상담' : 'Consultation'),
          method: form.method,
        });
        showSuccess(isKorean ? '상담이 생성되었습니다.' : 'Consultation created.');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      showError(errorMessage(error, '상담을 저장하지 못했습니다.', 'Unable to save consultation.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelSession = async (session) => {
    const who = session.user_name || session.user_email || '';
    if (!window.confirm(isKorean ? `${who ? `'${who}' ` : ''}상담을 취소하시겠습니까?` : `Cancel this consultation${who ? ` with '${who}'` : ''}?`)) return;
    try {
      await consultationsAPI.cancel(session.id);
      showSuccess(isKorean ? '상담이 취소되었습니다.' : 'Consultation cancelled.');
      await load();
    } catch (error) {
      showError(errorMessage(error, '상담을 취소하지 못했습니다.', 'Unable to cancel consultation.'));
    }
  };

  const withCurrent = (options, value) => (
    !value || options.some((option) => option.value === value) ? options : [...options, { value, en: value }]
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{isKorean ? '상담 관리' : 'Consultation Management'}</Typography>
          <Typography variant="body2" color="text.secondary">{isKorean ? '상담 세션을 생성, 수정, 취소합니다.' : 'Create, edit, and cancel consultation sessions.'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{isKorean ? '새로고침' : 'Refresh'}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{isKorean ? '상담 추가' : 'Add Consultation'}</Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead><TableRow>
                <TableCell>{isKorean ? '대상자' : 'User'}</TableCell>
                <TableCell>{isKorean ? '상담자' : 'Consultant'}</TableCell>
                <TableCell>{isKorean ? '일시' : 'Date'}</TableCell>
                <TableCell>{isKorean ? '주제' : 'Topic'}</TableCell>
                <TableCell>{isKorean ? '방식' : 'Method'}</TableCell>
                <TableCell>{isKorean ? '상태' : 'Status'}</TableCell>
                <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {sessions.map((session) => {
                  const status = normalizeValue(session.status, '예약됨');
                  const statusOption = STATUS_OPTIONS.find((option) => option.value === status);
                  const scheduled = session.scheduled_at ? dayjs(session.scheduled_at) : null;
                  return (
                    <TableRow key={session.id} hover>
                      <TableCell>{session.user_name || session.user_email || '-'}</TableCell>
                      <TableCell>{session.consultant_name || '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{scheduled?.isValid() ? scheduled.format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                      <TableCell>{session.topic || '-'}</TableCell>
                      <TableCell>{optionLabel(METHOD_OPTIONS, normalizeValue(session.method, ''))}</TableCell>
                      <TableCell><Chip size="small" color={statusOption?.color || 'default'} label={optionLabel(STATUS_OPTIONS, status)} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" onClick={() => openEdit(session)}>{isKorean ? '수정' : 'Edit'}</Button>
                        {status !== '취소' && (
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => cancelSession(session)}>{isKorean ? '상담 취소' : 'Cancel'}</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sessions.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}>{isKorean ? '등록된 상담이 없습니다.' : 'No consultations are available.'}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editing ? (isKorean ? '상담 수정' : 'Edit Consultation') : (isKorean ? '상담 추가' : 'Add Consultation')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              {editing ? (
                <TextField fullWidth disabled label={isKorean ? '대상자' : 'User'} value={editing.user_name || editing.user_email || '-'} />
              ) : (
                <TextField select fullWidth label={isKorean ? '대상자' : 'User'} value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
                  {athletes.map((user) => <MenuItem key={user.id} value={user.id}>{userName(user)}</MenuItem>)}
                </TextField>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {editing ? (
                <TextField fullWidth disabled label={isKorean ? '상담자' : 'Consultant'} value={editing.consultant_name || '-'} />
              ) : (
                <TextField select fullWidth label={isKorean ? '상담자' : 'Consultant'} value={form.consultant_id} onChange={(e) => setForm({ ...form, consultant_id: e.target.value })}>
                  {consultants.map((user) => <MenuItem key={user.id} value={user.id}>{userName(user)}</MenuItem>)}
                </TextField>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth disabled={Boolean(editing)} type="datetime-local" label={isKorean ? '상담 일시' : 'Date and time'} value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth type="number" disabled={Boolean(editing)} inputProps={{ min: 10, step: 10 }} label={isKorean ? '시간(분)' : 'Duration (min)'} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth disabled={Boolean(editing)} label={isKorean ? '주제' : 'Topic'} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth label={isKorean ? '방식' : 'Method'} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {withCurrent(METHOD_OPTIONS, form.method).map((option) => <MenuItem key={option.value} value={option.value}>{isKorean ? option.value : option.en}</MenuItem>)}
            </TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth disabled={!editing} label={isKorean ? '상태' : 'Status'} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {withCurrent(STATUS_OPTIONS, form.status).map((option) => <MenuItem key={option.value} value={option.value}>{isKorean ? option.value : option.en}</MenuItem>)}
            </TextField></Grid>
            {editing && (
              <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label={isKorean ? '메모' : 'Notes'} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{isKorean ? '닫기' : 'Close'}</Button>
          <Button variant="contained" onClick={saveSession} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultationManagement;
