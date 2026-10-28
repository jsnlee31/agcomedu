import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { apiArray, consultationsAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

// The backend stores Korean values; English is only a display label.
const METHOD_OPTIONS = [
  { value: '온라인', en: 'Online' },
  { value: '오프라인', en: 'In person' },
  { value: '전화', en: 'Phone' },
];

// available_date comes back as 'YYYY-MM-DD' (older deployments may return an
// ISO timestamp); start/end times as 'HH:MM' (or 'HH:MM:SS').
const toDateKey = (value) => {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : raw.slice(0, 10);
};
const toTimeKey = (value) => (value ? String(value).slice(0, 5) : '');
const normalizeSlot = (slot) => ({
  ...slot,
  available_date: toDateKey(slot.available_date),
  start_time: toTimeKey(slot.start_time),
  end_time: toTimeKey(slot.end_time),
});

const getConsultantId = (consultant) => consultant?.id || consultant?.consultant_id;

const ConsultationBooking = () => {
  const navigate = useNavigate();
  const isKorean = useIsKorean();
  const locale = isKorean ? 'ko' : 'en';
  const [activeStep, setActiveStep] = useState(0);
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [topic, setTopic] = useState('');
  const [method, setMethod] = useState('온라인');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);

  const getConsultantName = (consultant) => (
    (isKorean ? consultant?.name_ko || consultant?.name_en : consultant?.name_en || consultant?.name_ko)
    || consultant?.name || consultant?.consultant_name || (isKorean ? '상담사' : 'Consultant')
  );
  const methodLabel = (value) => {
    const option = METHOD_OPTIONS.find((item) => item.value === value);
    return option ? (isKorean ? option.value : option.en) : value;
  };
  const formatDate = (date, pattern) => (date ? dayjs(date).locale(locale).format(pattern) : '-');

  useEffect(() => {
    const loadConsultants = async () => {
      setLoading(true);
      setMessage('');
      try {
        const response = await consultationsAPI.getConsultants();
        setConsultants(apiArray(response.data, 'consultants'));
      } catch {
        setConsultants([]);
        setMessage(isKorean ? '상담사 목록을 불러오지 못했습니다.' : 'Unable to load consultants.');
      } finally {
        setLoading(false);
      }
    };
    loadConsultants();
  }, [isKorean]);

  const consultantId = getConsultantId(selectedConsultant);

  useEffect(() => {
    if (!consultantId) return undefined;
    let active = true;

    const loadAvailability = async () => {
      setSlotsLoading(true);
      setAvailableSlots([]);
      setSelectedDate('');
      setSelectedSlot(null);
      try {
        const response = await consultationsAPI.getAvailability(consultantId, {
          date_from: dayjs().format('YYYY-MM-DD'),
        });
        const now = dayjs();
        const slots = apiArray(response.data, 'slots')
          .map(normalizeSlot)
          .filter((slot) => !slot.is_booked && slot.available_date)
          // Hide slots that have already started today.
          .filter((slot) => !dayjs(`${slot.available_date}T${slot.start_time || '00:00'}`).isBefore(now));
        if (active) setAvailableSlots(slots);
      } catch {
        if (active) setMessage(isKorean ? '예약 가능 시간을 불러오지 못했습니다.' : 'Unable to load available time slots.');
      } finally {
        if (active) setSlotsLoading(false);
      }
    };

    loadAvailability();
    return () => { active = false; };
  }, [consultantId, isKorean, slotsReloadKey]);

  const uniqueDates = useMemo(
    () => [...new Set(availableSlots.map((slot) => slot.available_date))].sort(),
    [availableSlots]
  );
  const slotsForDate = availableSlots
    .filter((slot) => slot.available_date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const canProceed = () => {
    if (activeStep === 0) return Boolean(selectedConsultant);
    if (activeStep === 1) return Boolean(selectedSlot);
    if (activeStep === 2) return Boolean(topic.trim());
    return true;
  };

  const bookConsultation = async () => {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      await consultationsAPI.book({
        consultant_id: consultantId,
        slot_id: selectedSlot.id,
        topic: topic.trim(),
        method,
      });
      setSuccess(true);
    } catch (error) {
      setMessage(error.response?.data?.error || (isKorean ? '예약에 실패했습니다. 다시 시도해 주세요.' : 'Booking failed. Please try again.'));
      if (error.response?.status === 400) {
        // The slot was probably taken meanwhile: refresh and go back to time selection.
        setSlotsReloadKey((key) => key + 1);
        setActiveStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const slotText = (slot) => (slot
    ? `${formatDate(slot.available_date, isKorean ? 'YYYY년 M월 D일 (ddd)' : 'ddd, MMM D, YYYY')} ${slot.start_time}${slot.end_time ? ` - ${slot.end_time}` : ''}`
    : '-');

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
        <CheckIcon sx={{ fontSize: 64, color: '#059669', mb: 2 }} />
        <Typography variant="h5" fontWeight={700}>{isKorean ? '상담 예약 완료' : 'Consultation booked'}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          {getConsultantName(selectedConsultant)} | {slotText(selectedSlot)}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/activities/consultations')}>{isKorean ? '나의 상담 보기' : 'View my consultations'}</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>{isKorean ? '상담 예약' : 'Consultation Booking'}</Typography>
        <Typography variant="body2" color="text.secondary">{isKorean ? '아시안게임 선수와 스태프를 위한 지원 상담을 예약합니다.' : 'Book support sessions for Asian Games athletes and staff.'}</Typography>
      </Box>

      {message && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      <Box sx={{ overflowX: 'auto', mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ minWidth: { xs: 0, sm: 360 }, '& .MuiStepConnector-root': { minWidth: 8 }, '& .MuiStepLabel-label': { fontSize: { xs: '0.75rem', sm: '0.875rem' }, whiteSpace: 'nowrap' } }}>
          {(isKorean ? ['상담사', '시간', '상세 내용', '확인'] : ['Consultant', 'Time', 'Details', 'Confirm']).map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
      </Box>

      {activeStep === 0 && (
        <Grid container spacing={2}>
          {loading ? [1, 2, 3].map((item) => (
            <Grid size={{ xs: 12, md: 4 }} key={item}><Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} /></Grid>
          )) : consultants.length === 0 ? (
            <Grid size={{ xs: 12 }}><Alert severity="info">{isKorean ? '현재 예약 가능한 상담사가 없습니다.' : 'No consultants are currently available.'}</Alert></Grid>
          ) : consultants.map((consultant) => {
            const selected = consultantId === getConsultantId(consultant);
            return (
              <Grid size={{ xs: 12, md: 4 }} key={getConsultantId(consultant)}>
                <Card onClick={() => setSelectedConsultant(consultant)} sx={{ cursor: 'pointer', border: '2px solid', borderColor: selected ? '#0047BA' : 'transparent' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#0047BA' }} src={consultant.profile_image || undefined}>{getConsultantName(consultant).charAt(0)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{getConsultantName(consultant)}</Typography>
                        <Typography variant="body2" color="text.secondary">{consultant.department || consultant.position || (isKorean ? '선수단 지원' : 'Delegation support')}</Typography>
                      </Box>
                      {selected && <CheckIcon sx={{ ml: 'auto', color: '#0047BA' }} />}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {activeStep === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>{isKorean ? '날짜' : 'Date'}</Typography>
              {slotsLoading ? [1, 2, 3].map((item) => <Skeleton key={item} height={42} sx={{ mb: 1 }} />) : uniqueDates.length === 0 ? <Alert severity="info">{isKorean ? '예약 가능한 날짜가 없습니다.' : 'No available dates.'}</Alert> : uniqueDates.map((date) => (
                <Button key={date} fullWidth variant={selectedDate === date ? 'contained' : 'outlined'} onClick={() => { setSelectedDate(date); setSelectedSlot(null); }} sx={{ mb: 1, justifyContent: 'space-between' }}>
                  {formatDate(date, isKorean ? 'M월 D일 (ddd)' : 'MM/DD (ddd)')}
                  <Chip size="small" label={availableSlots.filter((slot) => slot.available_date === date).length} />
                </Button>
              ))}
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card><CardContent>
              <Typography fontWeight={700} sx={{ mb: 2 }}>{isKorean ? '시간' : 'Time'}</Typography>
              {!selectedDate ? <Typography color="text.secondary">{isKorean ? '먼저 날짜를 선택해 주세요.' : 'Select a date first.'}</Typography> : (
                <Grid container spacing={1.5}>
                  {slotsForDate.map((slot) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={slot.id}>
                      <Button fullWidth variant={selectedSlot?.id === slot.id ? 'contained' : 'outlined'} onClick={() => setSelectedSlot(slot)}>
                        {slot.start_time}{slot.end_time ? ` - ${slot.end_time}` : ''}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {activeStep === 2 && (
        <Card><CardContent>
          <TextField label={isKorean ? '상담 주제' : 'Topic'} placeholder={isKorean ? '훈련, 영양, 회복, 심리 관리 등' : 'Training, nutrition, recovery, mental care...'} fullWidth multiline rows={4} value={topic} inputProps={{ maxLength: 200 }} onChange={(event) => setTopic(event.target.value)} sx={{ mb: 3 }} />
          <Typography fontWeight={700} sx={{ mb: 1 }}>{isKorean ? '상담 방식' : 'Method'}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {METHOD_OPTIONS.map((option) => (
              <Button key={option.value} variant={method === option.value ? 'contained' : 'outlined'} onClick={() => setMethod(option.value)}>
                {isKorean ? option.value : option.en}
              </Button>
            ))}
          </Box>
        </CardContent></Card>
      )}

      {activeStep === 3 && (
        <Card sx={{ maxWidth: 640, mx: 'auto' }}><CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{isKorean ? '예약 확인' : 'Confirm booking'}</Typography>
          <Typography>{isKorean ? '상담사' : 'Consultant'}: {getConsultantName(selectedConsultant)}</Typography>
          <Typography>{isKorean ? '시간' : 'Time'}: {slotText(selectedSlot)}</Typography>
          <Typography>{isKorean ? '방식' : 'Method'}: {methodLabel(method)}</Typography>
          <Typography sx={{ mb: 3, wordBreak: 'break-word' }}>{isKorean ? '주제' : 'Topic'}: {topic}</Typography>
          <Button fullWidth variant="contained" onClick={bookConsultation} disabled={submitting}>
            {submitting ? (isKorean ? '예약 중...' : 'Booking...') : (isKorean ? '예약 확정' : 'Confirm booking')}
          </Button>
        </CardContent></Card>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 1 }}>
        <Button startIcon={<BackIcon />} disabled={activeStep === 0 || submitting} onClick={() => setActiveStep((step) => step - 1)}>{isKorean ? '이전' : 'Back'}</Button>
        {activeStep < 3 && <Button endIcon={<NextIcon />} variant="contained" disabled={!canProceed()} onClick={() => setActiveStep((step) => step + 1)}>{isKorean ? '다음' : 'Next'}</Button>}
      </Box>
    </Box>
  );
};

export default ConsultationBooking;
