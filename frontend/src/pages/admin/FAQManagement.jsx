import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { apiArray, faqAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const emptyFaq = {
  category_id: '',
  question_ko: '',
  question_en: '',
  answer_ko: '',
  answer_en: '',
  sort_order: 0,
  is_active: true,
};

const FAQManagement = () => {
  const isKorean = useIsKorean();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyFaq);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [faqResponse, categoryResponse] = await Promise.all([faqAPI.getAll(), faqAPI.getCategories()]);
      setFaqs(apiArray(faqResponse.data, 'faqs'));
      setCategories(apiArray(categoryResponse.data, 'categories'));
    } catch (error) {
      setFaqs([]);
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? 'FAQ를 불러오지 못했습니다.' : 'Unable to load FAQ entries.'));
    } finally {
      setLoading(false);
    }
  }, [showError, isKorean]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyFaq, category_id: categories[0]?.id || '' });
    setDialogOpen(true);
  };

  const openEdit = (faq) => {
    setEditing(faq);
    setForm({
      ...emptyFaq,
      question_ko: faq.question_ko || faq.question || '',
      question_en: faq.question_en || '',
      answer_ko: faq.answer_ko || faq.answer || '',
      answer_en: faq.answer_en || '',
      category_id: faq.category_id || '',
      sort_order: faq.sort_order || 0,
      is_active: faq.is_active !== false,
    });
    setDialogOpen(true);
  };

  const saveFaq = async () => {
    if (!String(form.question_ko || '').trim() || !String(form.answer_ko || '').trim()) {
      showError(isKorean ? '질문과 답변을 입력하세요.' : 'Question and answer are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category_id: form.category_id || null,
        question_ko: form.question_ko.trim(),
        question_en: String(form.question_en || '').trim() || null,
        answer_ko: form.answer_ko.trim(),
        answer_en: String(form.answer_en || '').trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active !== false,
      };
      if (editing) {
        await faqAPI.update(editing.id, payload);
        showSuccess(isKorean ? 'FAQ가 수정되었습니다.' : 'FAQ updated.');
      } else {
        await faqAPI.create(payload);
        showSuccess(isKorean ? 'FAQ가 생성되었습니다.' : 'FAQ created.');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? 'FAQ를 저장하지 못했습니다.' : 'Unable to save FAQ.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (faq) => {
    const question = faq.question_ko || faq.question_en || faq.question || '';
    if (!window.confirm(isKorean ? `'${question}' FAQ를 삭제할까요?` : `Delete FAQ '${question}'?`)) return;
    try {
      await faqAPI.delete(faq.id);
      showSuccess(isKorean ? 'FAQ가 삭제되었습니다.' : 'FAQ deleted.');
      await load();
    } catch (error) {
      showError(error.response?.data?.error || error.response?.data?.detail || (isKorean ? 'FAQ를 삭제하지 못했습니다.' : 'Unable to delete FAQ.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{isKorean ? 'FAQ 관리' : 'FAQ Management'}</Typography>
          <Typography variant="body2" color="text.secondary">{isKorean ? '자주 묻는 질문을 생성, 수정, 삭제합니다.' : 'Create, edit, and delete FAQ entries.'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>{isKorean ? '새로고침' : 'Refresh'}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>{isKorean ? 'FAQ 추가' : 'Add FAQ'}</Button>
        </Box>
      </Box>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : (
          <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 600 }}><TableHead><TableRow>
            <TableCell>{isKorean ? '질문' : 'Question'}</TableCell>
            <TableCell>{isKorean ? '분류' : 'Category'}</TableCell>
            <TableCell>{isKorean ? '상태' : 'Active'}</TableCell>
            <TableCell align="right">{isKorean ? '작업' : 'Actions'}</TableCell>
          </TableRow></TableHead><TableBody>
            {faqs.map((faq) => <TableRow key={faq.id} hover>
              <TableCell>{(isKorean ? faq.question_ko || faq.question_en : faq.question_en || faq.question_ko) || faq.question || '-'}</TableCell>
              <TableCell>{(() => {
                const category = categories.find((cat) => cat.id === faq.category_id);
                if (category) return (isKorean ? category.name_ko || category.name_en : category.name_en || category.name_ko) || '-';
                return faq.category_name || faq.category_name_ko || '-';
              })()}</TableCell>
              <TableCell>{faq.is_active === false ? (isKorean ? '비활성' : 'Inactive') : (isKorean ? '활성' : 'Active')}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Button size="small" onClick={() => openEdit(faq)}>{isKorean ? '수정' : 'Edit'}</Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => deleteFaq(faq)}>{isKorean ? '삭제' : 'Delete'}</Button>
              </TableCell>
            </TableRow>)}
            {faqs.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}>{isKorean ? '등록된 FAQ가 없습니다.' : 'No FAQ entries are available.'}</TableCell></TableRow>}
          </TableBody></Table></TableContainer>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreenDialog}>
        <DialogTitle>{editing ? (isKorean ? 'FAQ 수정' : 'Edit FAQ') : (isKorean ? 'FAQ 추가' : 'Add FAQ')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField select fullWidth label={isKorean ? '분류' : 'Category'} value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <MenuItem value="">{isKorean ? '분류 없음' : 'No category'}</MenuItem>
              {categories.map((category) => <MenuItem key={category.id} value={category.id}>{(isKorean ? category.name_ko || category.name_en : category.name_en || category.name_ko) || '-'}</MenuItem>)}
            </TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth type="number" label={isKorean ? '정렬 순서' : 'Sort order'} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth required label={isKorean ? '질문' : 'Question'} value={form.question_ko} onChange={(e) => setForm({ ...form, question_ko: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label={isKorean ? '영문 질문' : 'English question'} value={form.question_en || ''} onChange={(e) => setForm({ ...form, question_en: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth required multiline minRows={4} label={isKorean ? '답변' : 'Answer'} value={form.answer_ko} onChange={(e) => setForm({ ...form, answer_ko: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label={isKorean ? '영문 답변' : 'English answer'} value={form.answer_en || ''} onChange={(e) => setForm({ ...form, answer_en: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{isKorean ? '취소' : 'Cancel'}</Button>
          <Button variant="contained" onClick={saveFaq} disabled={saving}>{saving ? (isKorean ? '저장 중...' : 'Saving...') : (isKorean ? '저장' : 'Save')}</Button>

        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FAQManagement;
