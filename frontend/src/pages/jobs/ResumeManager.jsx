import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, LinearProgress, TextField, Typography,
} from '@mui/material';
import {
  Add as AddIcon, ArrowBack as ArrowBackIcon, AttachFile as AttachFileIcon,
  Delete as DeleteIcon, Download as DownloadIcon, Edit as EditIcon,
  Star as StarIcon, StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { apiArray, resumesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const normalizeContent = (content) => {
  if (!content) return {};
  if (typeof content === 'object') return content;
  try { return JSON.parse(content); } catch { return {}; }
};

const sectionNames = {
  summary: /^(summary|profile|objective|소개|요약|프로필|지원동기)\s*[:：]?$/i,
  experience: /^(experience|employment|work history|career|경력|경력사항|직무경험)\s*[:：]?$/i,
  skills: /^(skills|competencies|technical skills|기술|보유기술|역량)\s*[:：]?$/i,
  education: /^(education|certifications?|qualifications?|학력|학력사항|자격|자격증)\s*[:：]?$/i,
};

const splitResumeText = (text, fallbackTitle) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sections = { summary: [], experience: [], skills: [], education: [] };
  let active = 'summary';
  let title = fallbackTitle.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  if (lines[0] && lines[0].length <= 100 && !Object.values(sectionNames).some((pattern) => pattern.test(lines[0]))) {
    title = lines.shift();
  }
  lines.forEach((line) => {
    const match = Object.entries(sectionNames).find(([, pattern]) => pattern.test(line));
    if (match) active = match[0];
    else sections[active].push(line);
  });
  const skillText = sections.skills.join(', ');
  return {
    title,
    summary: sections.summary.join('\n'),
    experience: sections.experience.join('\n'),
    skills: skillText.split(/[,•·|\n]/).map((item) => item.trim()).filter(Boolean).join(', '),
    education: sections.education.join('\n'),
  };
};

const readDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const extractText = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'txt' || extension === 'md') return file.text();
  if (extension === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n');
  }
  const error = new Error('UNSUPPORTED_FILE');
  error.code = 'UNSUPPORTED_FILE';
  throw error;
};

const downloadAttachment = (attachment) => {
  const anchor = document.createElement('a');
  anchor.href = attachment.dataUrl;
  anchor.download = attachment.name;
  anchor.click();
};

const ResumeManager = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const { showSuccess, showError } = useNotification();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResume, setEditingResume] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await resumesAPI.getAll();
      setResumes(apiArray(response.data, 'resumes'));
    } catch { showError(isKorean ? '이력서를 불러오지 못했습니다.' : 'Unable to load resumes.'); }
    finally { setLoading(false); }
  }, [isKorean, showError]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleOpenDialog = (resume = null) => {
    const content = normalizeContent(resume?.content);
    setEditingResume(resume);
    setAttachment(content.attachment || null);
    setParseMessage('');
    reset({
      title: resume?.title || '', summary: content.summary || '', experience: content.experience || '',
      skills: Array.isArray(content.skills) ? content.skills.join(', ') : (content.skills || ''),
      education: content.education || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingResume(null); setAttachment(null); reset(); };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showError(isKorean ? '파일은 5MB 이하여야 합니다.' : 'The file must be 5 MB or smaller.');
    setParsing(true);
    setParseMessage('');
    try {
      const [text, dataUrl] = await Promise.all([extractText(file), readDataUrl(file)]);
      const parsed = splitResumeText(text, file.name);
      Object.entries(parsed).forEach(([field, value]) => setValue(field, value, { shouldDirty: true, shouldValidate: true }));
      setAttachment({ name: file.name, type: file.type, size: file.size, dataUrl });
      setParseMessage(isKorean ? '파일을 분석하여 제목과 항목별 내용으로 나눴습니다. 저장하면 원본도 첨부됩니다.' : 'The file was parsed into a title and sections. The original will be attached when saved.');
    } catch (error) {
      if (error?.code === 'UNSUPPORTED_FILE') showError(isKorean ? 'PDF, DOCX, TXT, MD 파일만 선택할 수 있습니다.' : 'Please select a PDF, DOCX, TXT, or Markdown file.');
      else showError(isKorean ? '파일 분석에 실패했습니다.' : 'Unable to parse the file.');
    }
    finally { setParsing(false); }
  };

  const onSubmit = async (data) => {
    const payload = { title: data.title, content: {
      summary: data.summary, experience: data.experience,
      skills: (data.skills || '').split(',').map((item) => item.trim()).filter(Boolean),
      education: data.education, attachment,
    } };
    try {
      if (editingResume) await resumesAPI.update(editingResume.id, payload); else await resumesAPI.create(payload);
      showSuccess(isKorean ? '이력서가 저장되었습니다.' : 'Resume saved.');
      closeDialog(); fetchResumes();
    } catch (error) { showError(isKorean ? '이력서를 저장하지 못했습니다.' : (error.response?.data?.error || 'Unable to save resume.')); }
  };

  const remove = async (id) => {
    if (!window.confirm(isKorean ? '이 이력서를 삭제하시겠습니까?' : 'Delete this resume?')) return;
    try { await resumesAPI.delete(id); setResumes((items) => items.filter((item) => item.id !== id)); }
    catch { showError(isKorean ? '삭제하지 못했습니다.' : 'Unable to delete resume.'); }
  };

  const makePrimary = async (id) => {
    try { await resumesAPI.setPrimary(id); setResumes((items) => items.map((item) => ({ ...item, is_primary: item.id === id }))); }
    catch { showError(isKorean ? '대표 이력서를 변경하지 못했습니다.' : 'Unable to update primary resume.'); }
  };

  return <Box>
    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/jobs')} sx={{ mb: 2 }}>{isKorean ? '채용 목록으로' : 'Back to jobs'}</Button>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <Typography variant="h5" fontWeight={700}>{isKorean ? '이력서 관리' : 'Resume Management'}</Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>{isKorean ? '이력서 작성' : 'Create resume'}</Button>
    </Box>
    {loading ? <Typography>{isKorean ? '불러오는 중...' : 'Loading...'}</Typography> : resumes.length === 0 ? <Card><CardContent sx={{ textAlign: 'center', py: 8 }}><Typography color="text.secondary" sx={{ mb: 2 }}>{isKorean ? '등록된 이력서가 없습니다.' : 'No resumes yet.'}</Typography><Button variant="contained" onClick={() => handleOpenDialog()}>{isKorean ? '이력서 작성' : 'Create resume'}</Button></CardContent></Card> :
      <Grid container spacing={2}>{resumes.map((resume) => { const content = normalizeContent(resume.content); return <Grid size={{ xs: 12, sm: 6, md: 4 }} key={resume.id}><Card><CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Box><Typography fontWeight={700} sx={{ wordBreak: 'break-word' }}>{!resume.title || resume.title === 'Untitled resume' ? (isKorean ? '제목 없는 이력서' : 'Untitled resume') : resume.title}</Typography>{resume.is_primary && <Chip size="small" color="primary" label={isKorean ? '대표' : 'Primary'} />}</Box><IconButton onClick={() => makePrimary(resume.id)}>{resume.is_primary ? <StarIcon /> : <StarBorderIcon />}</IconButton></Box>
        {content.attachment && <Button size="small" startIcon={<DownloadIcon />} onClick={() => downloadAttachment(content.attachment)} sx={{ mt: 1 }}>{content.attachment.name}</Button>}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}><Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleOpenDialog(resume)}>{isKorean ? '수정' : 'Edit'}</Button><Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => remove(resume.id)}>{isKorean ? '삭제' : 'Delete'}</Button></Box>
      </CardContent></Card></Grid>; })}</Grid>}
    <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
      <DialogTitle>{editingResume ? (isKorean ? '이력서 수정' : 'Edit resume') : (isKorean ? '이력서 작성' : 'Create resume')}</DialogTitle>
      <DialogContent><Box component="form" sx={{ pt: 1 }}>
        <TextField fullWidth label={isKorean ? '제목' : 'Title'} {...register('title', { required: isKorean ? '제목을 입력해 주세요.' : 'Title is required' })} error={!!errors.title} helperText={errors.title?.message} sx={{ mb: 2 }} />
        <TextField fullWidth label={isKorean ? '요약' : 'Summary'} multiline rows={3} {...register('summary')} sx={{ mb: 2 }} />
        <TextField fullWidth label={isKorean ? '경력' : 'Experience'} multiline rows={4} {...register('experience')} sx={{ mb: 2 }} />
        <TextField fullWidth label={isKorean ? '기술' : 'Skills'} {...register('skills')} sx={{ mb: 2 }} />
        <TextField fullWidth label={isKorean ? '학력 및 자격' : 'Education and certifications'} multiline rows={3} {...register('education')} sx={{ mb: 3 }} />
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>{isKorean ? '원본 이력서 첨부 및 자동 분석' : 'Attach and parse original resume'}</Typography>
          <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} disabled={parsing}>{isKorean ? '파일 선택' : 'Choose file'}<input hidden type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFile} /></Button>
          {parsing && <LinearProgress sx={{ mt: 2 }} />}
          {attachment && <Chip label={`${attachment.name} (${Math.ceil(attachment.size / 1024)} KB)`} onDelete={() => setAttachment(null)} sx={{ ml: 1 }} />}
          {parseMessage && <Alert severity="success" sx={{ mt: 2 }}>{parseMessage}</Alert>}
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>{isKorean ? 'PDF, DOCX, TXT, MD · 최대 5MB' : 'PDF, DOCX, TXT, MD · up to 5 MB'}</Typography>
        </Box>
      </Box></DialogContent>
      <DialogActions><Button onClick={closeDialog}>{isKorean ? '취소' : 'Cancel'}</Button><Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={parsing}>{isKorean ? '저장' : 'Save'}</Button></DialogActions>
    </Dialog>
  </Box>;
};

export default ResumeManager;
