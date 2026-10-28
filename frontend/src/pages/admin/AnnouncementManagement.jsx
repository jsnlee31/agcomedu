import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, MenuItem, Paper, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PushPin as PinIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { apiArray, announcementsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

// announcement.type values stored by the backend (announcements.type column).
const TYPE_OPTIONS = [
  { value: '일반', en: 'General' },
  { value: '안내', en: 'Notice' },
  { value: '긴급', en: 'Urgent' },
];

const emptyAnnouncement = {
  title_ko: '',
  title_en: '',
  content_ko: '',
  content_en: '',
  type: '일반',
  is_pinned: false,
  is_active: true,
};

const formatDate = (value, isKorean) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(isKorean ? 'ko-KR' : 'en-US');
};

const errorMessage = (error, fallback) => error?.response?.data?.error || error?.response?.data?.detail || fallback;

const AnnouncementManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useNotification();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAnnouncement);

  const typeLabel = (value) => {
    const option = TYPE_OPTIONS.find((item) => item.value === value);
    if (!option) return value || '-';
    return isKorean ? option.value : option.en;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await announcementsAPI.getAll({ all: true });
      setAnnouncements(apiArray(response.data, 'announcements'));
    } catch (error) {
      setAnnouncements([]);
      showError(errorMessage(error, isKorean ? '공지사항을 불러오지 못했습니다.' : 'Unable to load announcements.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyAnnouncement);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      ...emptyAnnouncement,
      title_ko: item.title_ko || item.title || '',
      title_en: item.title_en || '',
      content_ko: item.content_ko || item.content || '',
      content_en: item.content_en || '',
      type: item.type || '일반',
      is_pinned: Boolean(item.is_pinned),
      is_active: item.is_active !== false,
    });
    setDialogOpen(true);
  };

  const saveAnnouncement = async () => {
    if (!form.title_ko.trim()) {
      showError(isKorean ? '제목을 입력하세요.' : 'Korean title is required.');
      return;
    }
    if (!form.content_ko.trim()) {
      showError(isKorean ? '내용을 입력하세요.' : 'Korean content is required.');
      return;
    }
    const payload = {
      title_ko: form.title_ko.trim(),
      title_en: form.title_en.trim() || null,
      content_ko: form.content_ko.trim(),
      content_en: form.content_en.trim() || null,
      type: form.type || '일반',
      is_pinned: Boolean(form.is_pinned),
      is_active: Boolean(form.is_active),
    };
    setSaving(true);
    try {
      if (editing) {
        await announcementsAPI.update(editing.id, payload);
        showSuccess(isKorean ? '공지사항이 수정되었습니다.' : 'Announcement updated.');
      } else {
        await announcementsAPI.create(payload);
        showSuccess(isKorean ? '공지사항이 등록되었습니다.' : 'Announcement created.');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      showError(errorMessage(error, isKorean ? '공지사항을 저장하지 못했습니다.' : 'Unable to save announcement.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (item) => {
    const title = item.title_ko || item.title_en || item.title || '';
    if (!window.confirm(isKorean ? `'${title}' 공지사항을 삭제할까요?` : `Delete '${title}'?`)) return;
    try {
      await announcementsAPI.delete(item.id);
      showSuccess(isKorean ? '공지사항이 삭제되었습니다.' : 'Announcement deleted.');
      await load();
    } catch (error) {
      showError(errorMessage(error, isKorean ? '공지사항을 삭제하지 못했습니다.' : 'Unable to delete announcement.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{isKorean ? '공지사항 관리' : 'Announcement Management'}</Typography>
          <Typography variant="body2" color="text.secondary">{isKorean ? '공지사항을 등록, 수정, 삭제합니다.' : 'Create, edit, and delete announcements.'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{isKorean ? '새로고침' : 'Refresh'}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{isKorean ? '공지 추가' : 'Add Announcement'}</Button>
        </Box>
      </Box>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 640 }}>
            <TableHead><TableRow>
              <TableCell>{isKorean ? '제목' : 'Title'}</TableCell>
              <TableCell>{isKorean ? '유형' : 'Type'}</TableCell>
              <TableCell>{isKorean ? '상태' : 'Status'}</TableCell>
              <TableCell>{isKorean ? '등록일' : 'Created'}</TableCell>
              <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {announcements.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {item.is_pinned && <PinIcon fontSize="small" color="primary" titleAccess={isKorean ? '상단 고정' : 'Pinned'} />}
                      <span>{(isKorean ? item.title_ko || item.title_en : item.title_en || item.title_ko) || item.title || '-'}</span>
                    </Box>
                  </TableCell>
                  <TableCell><Chip size="small" label={typeLabel(item.type)} /></TableCell>
                  <TableCell><Chip size="small" color={item.is_active === false ? 'default' : 'success'} label={item.is_active === false ? (isKorean ? '비활성' : 'Inactive') : (isKorean ? '활성' : 'Active')} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.created_at, isKorean)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => openEdit(item)}>{isKorean ? '수정' : 'Edit'}</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteAnnouncement(item)}>{isKorean ? '삭제' : 'Delete'}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {announcements.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>{isKorean ? '등록된 공지사항이 없습니다.' : 'No announcements are available.'}</TableCell></TableRow>}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editing ? (isKorean ? '공지사항 수정' : 'Edit Announcement') : (isKorean ? '공지사항 추가' : 'Add Announcement')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth required label={isKorean ? '제목' : 'Korean title'} value={form.title_ko} onChange={(e) => setForm({ ...form, title_ko: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label={isKorean ? '영문 제목' : 'English title'} value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={isKorean ? '유형' : 'Type'} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {(TYPE_OPTIONS.some((option) => option.value === form.type) ? TYPE_OPTIONS : [...TYPE_OPTIONS, { value: form.type, en: form.type }]).map((option) => (
                  <MenuItem key={option.value} value={option.value}>{isKorean ? option.value : option.en}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Switch checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />} label={isKorean ? '상단 고정' : 'Pinned'} />
              <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />} label={isKorean ? '게시(활성)' : 'Active'} />
            </Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth required multiline minRows={5} label={isKorean ? '내용' : 'Korean content'} value={form.content_ko} onChange={(e) => setForm({ ...form, content_ko: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label={isKorean ? '영문 내용' : 'English content'} value={form.content_en} onChange={(e) => setForm({ ...form, content_en: e.target.value })} /></Grid>
            {!form.is_active && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  {isKorean ? '비활성 공지는 사용자 화면에 표시되지 않습니다. 다시 활성화하면 즉시 표시됩니다.' : 'Inactive announcements are hidden from users until re-activated.'}
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={saveAnnouncement} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnouncementManagement;
