import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { Refresh as RefreshIcon, Reply as ReplyIcon } from '@mui/icons-material';
import { apiArray, inquiriesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

// Inquiry status values used by the backend ('open'/'대기중' on create,
// 'completed' after a response) mapped to display labels.
const STATUS_LABELS = {
  open: ['대기중', 'Open'],
  pending: ['대기중', 'Open'],
  대기중: ['대기중', 'Open'],
  처리중: ['처리중', 'In progress'],
  in_progress: ['처리중', 'In progress'],
  completed: ['답변 완료', 'Answered'],
  완료: ['답변 완료', 'Answered'],
};
const isAnswered = (status) => ['completed', '완료'].includes(status);

const InquiryManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const statusLabel = (status) => {
    const label = STATUS_LABELS[status || 'open'];
    if (!label) return status;
    return isKorean ? label[0] : label[1];
  };
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inquiriesAPI.getAll();
      setInquiries(apiArray(response.data, 'inquiries'));
    } catch (error) {
      setInquiries([]);
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? '문의를 불러오지 못했습니다.' : 'Unable to load inquiries.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const openRespond = (item) => {
    setSelected(item);
    setResponseText(item.response || '');
  };

  const saveResponse = async () => {
    if (!selected) return;
    if (!responseText.trim()) {
      showError(isKorean ? '답변을 입력하세요.' : 'Response is required.');
      return;
    }
    setSaving(true);
    try {
      await inquiriesAPI.respond(selected.id, { response: responseText.trim() });
      showSuccess(isKorean ? '문의 답변이 저장되었습니다.' : 'Inquiry response saved.');
      setSelected(null);
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? '문의 답변을 저장하지 못했습니다.' : 'Unable to save inquiry response.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{isKorean ? '문의 관리' : 'Inquiry Management'}</Typography>
          <Typography variant="body2" color="text.secondary">{isKorean ? '사용자 문의를 확인하고 답변합니다.' : 'Review and respond to user inquiries.'}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{isKorean ? '새로고침' : 'Refresh'}</Button>
      </Box>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 600 }}><TableHead><TableRow>
            <TableCell>{isKorean ? '사용자' : 'User'}</TableCell>
            <TableCell>{isKorean ? '제목' : 'Title'}</TableCell>
            <TableCell>{isKorean ? '분류' : 'Category'}</TableCell>
            <TableCell>{isKorean ? '상태' : 'Status'}</TableCell>
            <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
          </TableRow></TableHead><TableBody>
            {inquiries.map((item) => <TableRow key={item.id} hover>
              <TableCell>{item.user_name || item.email || '-'}</TableCell>
              <TableCell>{item.title || '-'}</TableCell>
              <TableCell>{item.category || '-'}</TableCell>
              <TableCell><Chip size="small" color={isAnswered(item.status) ? 'success' : 'default'} label={statusLabel(item.status)} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Button size="small" startIcon={<ReplyIcon />} onClick={() => openRespond(item)}>{isAnswered(item.status) ? (isKorean ? '답변 수정' : 'Edit response') : (isKorean ? '답변' : 'Respond')}</Button>
              </TableCell>
            </TableRow>)}
            {inquiries.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>{isKorean ? '등록된 문의가 없습니다.' : 'No inquiries are available.'}</TableCell></TableRow>}
          </TableBody></Table></TableContainer>
        )}
      </Paper>

      <Dialog open={Boolean(selected)} onClose={() => !saving && setSelected(null)} maxWidth="sm" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{isKorean ? '문의 답변' : 'Respond to Inquiry'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" fontWeight={700}>{selected?.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', my: 2 }}>{selected?.content}</Typography>
          <TextField fullWidth multiline minRows={5} label={isKorean ? '답변' : 'Response'} value={responseText} onChange={(e) => setResponseText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)} disabled={saving}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={saveResponse} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>

        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InquiryManagement;
