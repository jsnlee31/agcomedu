import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { inquiriesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const Inquiry = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      category: '',
      title: '',
      content: '',
      email: '',
      phone: '',
      agreeToPrivacy: false,
    },
  });

  const categories = [
    { value: 'account', label: '회원/계정' },
    { value: 'program', label: '프로그램' },
    { value: 'job', label: '채용정보' },
    { value: 'learning', label: '학습자료' },
    { value: 'technical', label: '기술 문제' },
    { value: 'other', label: '기타' },
  ];

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await inquiriesAPI.create({
        category: data.category,
        title: data.title,
        content: data.content,
        contact_email: data.email,
        contact_phone: data.phone,
      });
      showSuccess('문의가 성공적으로 등록되었습니다. 빠른 시일 내에 답변 드리겠습니다.');
      reset();
      navigate('/support/inquiry/list');
    } catch (error) {
      showError('문의 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {t('support.inquiry')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('support.inquiryDescription')}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            문의 전 FAQ를 확인해주세요. 자주 묻는 질문에서 원하시는 답변을 찾으실 수 있습니다.
          </Alert>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {/* Category */}
            <Controller
              name="category"
              control={control}
              rules={{ required: '문의 유형을 선택해주세요' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="문의 유형"
                  error={!!errors.category}
                  helperText={errors.category?.message}
                  sx={{ mb: 3 }}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Title */}
            <Controller
              name="title"
              control={control}
              rules={{ required: '제목을 입력해주세요' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="제목"
                  placeholder="문의 제목을 입력해주세요"
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  sx={{ mb: 3 }}
                />
              )}
            />

            {/* Content */}
            <Controller
              name="content"
              control={control}
              rules={{
                required: '문의 내용을 입력해주세요',
                minLength: { value: 10, message: '최소 10자 이상 입력해주세요' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={6}
                  label="문의 내용"
                  placeholder="문의하실 내용을 자세히 작성해주세요"
                  error={!!errors.content}
                  helperText={errors.content?.message || '자세히 작성해주시면 더 빠른 답변이 가능합니다'}
                  sx={{ mb: 3 }}
                />
              )}
            />

            {/* Contact Info */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              답변 받으실 연락처
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: '이메일을 입력해주세요',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '올바른 이메일 형식을 입력해주세요',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="이메일"
                    type="email"
                    placeholder="example@email.com"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="연락처 (선택)"
                    placeholder="010-0000-0000"
                    helperText="전화 상담을 원하시면 입력해주세요"
                  />
                )}
              />
            </Box>

            {/* Privacy Agreement */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#F8F9FA', borderRadius: 1 }}>
              <Controller
                name="agreeToPrivacy"
                control={control}
                rules={{ required: '개인정보 수집에 동의해주세요' }}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        개인정보 수집 및 이용에 동의합니다. (필수)
                      </Typography>
                    }
                  />
                )}
              />
              {errors.agreeToPrivacy && (
                <Typography variant="caption" color="error">
                  {errors.agreeToPrivacy.message}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                수집 항목: 이메일, 연락처 / 이용 목적: 문의 답변 / 보유 기간: 답변 완료 후 1년
              </Typography>
            </Box>

            {/* Submit Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/support/inquiry/list')}
                sx={{ minWidth: 120 }}
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                sx={{ minWidth: 120 }}
              >
                {submitting ? '등록 중...' : '문의 등록'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Inquiry;
