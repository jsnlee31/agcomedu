import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  Check as CheckIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Delete as DeleteIcon,
  EventAvailable as AvailableIcon,
  EventBusy as BookedIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { apiArray, consultationsAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const TIME_SLOTS = [];
for (let hour = 9; hour < 17; hour += 1) {
  TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(hour).padStart(2, '0')}:30`);
}

const endTimeFor = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return `${String(hour + (minute === 30 ? 1 : 0)).padStart(2, '0')}:${minute === 30 ? '00' : '30'}`;
};

// Monday of the week containing `date`, independent of the dayjs locale.
const mondayOf = (date) => date.startOf('day').subtract((date.day() + 6) % 7, 'day');

// available_date is 'YYYY-MM-DD' (older deployments may return an ISO
// timestamp); times are 'HH:MM' (or 'HH:MM:SS').
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

const ConsultantSchedule = () => {
  const isKorean = useIsKorean();
  const locale = isKorean ? 'ko' : 'en';
  const [currentWeek, setCurrentWeek] = useState(() => mondayOf(dayjs()));
  const [mySlots, setMySlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [slotToDelete, setSlotToDelete] = useState(null);

  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, index) => currentWeek.add(index, 'day')), [currentWeek]);
  const dateFrom = weekDays[0].format('YYYY-MM-DD');
  const dateTo = weekDays[4].format('YYYY-MM-DD');

  const fetchSlots = useCallback(async () => {
    try {
      const response = await consultationsAPI.getMyAvailability({ date_from: dateFrom, date_to: dateTo });
      setMySlots(apiArray(response.data, 'slots').map(normalizeSlot));
      return true;
    } catch {
      setMySlots([]);
      setMessage({ severity: 'warning', text: isKorean ? '상담 가능 시간을 불러오지 못했습니다.' : 'Unable to load availability.' });
      return false;
    }
  }, [dateFrom, dateTo, isKorean]);

  useEffect(() => {
    setMessage(null);
    setSelectedSlots(new Set());
    fetchSlots();
  }, [fetchSlots]);

  const getSlotForCell = (date, time) => mySlots.find((slot) => slot.available_date === date.format('YYYY-MM-DD') && slot.start_time === time);

  const isPastCell = (day, time) => dayjs(`${day.format('YYYY-MM-DD')}T${time}`).isBefore(dayjs());

  const toggleSelect = (date, time) => {
    const key = `${date.format('YYYY-MM-DD')}_${time}`;
    if (getSlotForCell(date, time)) return;
    setSelectedSlots((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePublish = async () => {
    if (selectedSlots.size === 0 || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const slots = Array.from(selectedSlots).map((key) => {
        const [date, time] = key.split('_');
        return { date, start_time: time, end_time: endTimeFor(time) };
      });
      const response = await consultationsAPI.publishAvailability({ slots });
      // The API returns the inserted rows (with real ids); duplicates are skipped.
      const inserted = apiArray(response.data, 'slots').map(normalizeSlot).filter((slot) => slot.id);
      if (inserted.length === slots.length) {
        setMySlots((previous) => {
          const existingIds = new Set(previous.map((slot) => slot.id));
          return [...previous, ...inserted.filter((slot) => !existingIds.has(slot.id))];
        });
      } else {
        await fetchSlots();
      }
      setSelectedSlots(new Set());
      setMessage({
        severity: 'success',
        text: isKorean ? `상담 가능 시간 ${inserted.length}개가 게시되었습니다.` : `${inserted.length} availability slot(s) published.`,
      });
    } catch (error) {
      setMessage({ severity: 'warning', text: error.response?.data?.error || (isKorean ? '상담 가능 시간을 게시하지 못했습니다.' : 'Unable to publish availability.') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return;
    try {
      await consultationsAPI.deleteAvailability(slotToDelete.id);
      setMySlots((previous) => previous.filter((slot) => slot.id !== slotToDelete.id));
      setMessage({ severity: 'success', text: isKorean ? '상담 가능 시간이 삭제되었습니다.' : 'Availability removed.' });
    } catch (error) {
      setMessage({ severity: 'warning', text: error.response?.data?.error || (isKorean ? '상담 가능 시간을 삭제하지 못했습니다.' : 'Unable to delete availability.') });
      await fetchSlots();
    } finally {
      setSlotToDelete(null);
    }
  };

  const totalSlots = mySlots.length;
  const bookedSlots = mySlots.filter((slot) => slot.is_booked).length;
  const availableCount = totalSlots - bookedSlots;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>{isKorean ? '상담 일정 관리' : 'Consultant Schedule'}</Typography>
          <Typography variant="body2" color="text.secondary">{isKorean ? '선수 상담을 위한 예약 가능 시간을 게시합니다.' : 'Publish availability for athlete consultations.'}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handlePublish} disabled={selectedSlots.size === 0 || saving}>
          {saving
            ? (isKorean ? '게시 중...' : 'Publishing...')
            : selectedSlots.size > 0 ? (isKorean ? `${selectedSlots.size}개 게시` : `Publish ${selectedSlots.size}`) : (isKorean ? '예약 가능 시간 게시' : 'Publish availability')}
        </Button>
      </Box>

      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { key: 'published', label: isKorean ? '게시됨' : 'Published', value: totalSlots, color: '#0047BA', bg: '#EBF0FA', icon: <CalendarIcon /> },
          { key: 'booked', label: isKorean ? '예약됨' : 'Booked', value: bookedSlots, color: '#059669', bg: '#ECFDF5', icon: <BookedIcon /> },
          { key: 'available', label: isKorean ? '예약 가능' : 'Available', value: availableCount, color: '#EA580C', bg: '#FFF7ED', icon: <AvailableIcon /> },
        ].map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.key}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: '8px', bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>{stat.icon}</Box>
                <Box><Typography variant="h6" fontWeight={700}>{stat.value}</Typography><Typography variant="caption" color="text.secondary">{stat.label}</Typography></Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton aria-label={isKorean ? '이전 주' : 'Previous week'} onClick={() => setCurrentWeek((week) => week.subtract(7, 'day'))}><PrevIcon /></IconButton>
              <Typography fontWeight={700}>{dateFrom} ~ {dateTo}</Typography>
              <IconButton aria-label={isKorean ? '다음 주' : 'Next week'} onClick={() => setCurrentWeek((week) => week.add(7, 'day'))}><NextIcon /></IconButton>
            </Box>
            <Button variant="outlined" size="small" onClick={() => setCurrentWeek(mondayOf(dayjs()))}>{isKorean ? '이번 주' : 'This week'}</Button>
          </Box>

          <TableContainer sx={{ maxHeight: 560, overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
              <TableHead><TableRow><TableCell>{isKorean ? '시간' : 'Time'}</TableCell>{weekDays.map((day) => <TableCell key={day.format('YYYY-MM-DD')} align="center">{day.locale(locale).format(isKorean ? 'M/D (ddd)' : 'ddd MM/DD')}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {TIME_SLOTS.map((time) => (
                  <TableRow key={time}>
                    <TableCell>{time}</TableCell>
                    {weekDays.map((day) => {
                      const slot = getSlotForCell(day, time);
                      const key = `${day.format('YYYY-MM-DD')}_${time}`;
                      const isSelected = selectedSlots.has(key);
                      const isPast = isPastCell(day, time);
                      return (
                        <TableCell key={day.format('YYYY-MM-DD')} align="center" onClick={() => !isPast && !slot && toggleSelect(day, time)} sx={{ cursor: isPast || slot ? 'default' : 'pointer', bgcolor: isSelected ? alpha('#0047BA', 0.08) : slot?.is_booked ? alpha('#059669', 0.06) : slot ? alpha('#0047BA', 0.04) : isPast ? alpha('#000000', 0.02) : 'inherit' }}>
                          {slot?.is_booked ? <Chip size="small" label={slot.booked_by_name || (isKorean ? '예약됨' : 'Booked')} color="success" /> : slot ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Chip size="small" label={isKorean ? '가능' : 'Available'} />
                              <IconButton size="small" aria-label={isKorean ? '삭제' : 'Delete'} onClick={(event) => { event.stopPropagation(); setSlotToDelete(slot); }}><DeleteIcon fontSize="small" color="error" /></IconButton>
                            </Box>
                          ) : isSelected ? <Chip size="small" icon={<CheckIcon />} label={isKorean ? '선택됨' : 'Selected'} color="primary" /> : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={Boolean(slotToDelete)} onClose={() => setSlotToDelete(null)}>
        <DialogTitle>{isKorean ? '상담 가능 시간 삭제' : 'Delete availability'}</DialogTitle>
        <DialogContent>
          <Typography>
            {slotToDelete ? `${dayjs(slotToDelete.available_date).locale(locale).format(isKorean ? 'YYYY년 M월 D일 (ddd)' : 'ddd, MMM D, YYYY')} ${slotToDelete.start_time} - ${slotToDelete.end_time}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isKorean ? '이 시간을 삭제하시겠습니까?' : 'Delete this time slot?'}
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setSlotToDelete(null)}>{isKorean ? '취소' : 'Cancel'}</Button><Button variant="contained" color="error" onClick={handleDeleteSlot}>{isKorean ? '삭제' : 'Delete'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultantSchedule;
