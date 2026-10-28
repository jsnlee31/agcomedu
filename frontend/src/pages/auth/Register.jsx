import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useIsKorean } from '../../utils/language';

const localizeRegisterError = (message, isKorean) => {
  if (!isKorean) return message || 'Registration failed.';
  const text = String(message || '');
  if (/email already registered/i.test(text)) return '이미 등록된 이메일입니다.';
  if (/employee id is already registered/i.test(text)) return '이미 등록된 사번입니다.';
  if (/invalid value/i.test(text)) return '입력값을 다시 확인해 주세요.';
  if (!text || /registration failed/i.test(text)) return '회원가입에 실패했습니다.';
  return text;
};

const Register = () => {
  const { t } = useTranslation();
  const isKorean = useIsKorean();
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    const userData = {
      email: String(data.email || '').trim(),
      password: data.password,
      name_ko: String(data.name_ko || '').trim(),
      name_en: data.name_en,
      phone: data.phone,
      employee_id: data.employee_id,
    };

    const result = await registerUser(userData);
    setLoading(false);

    if (result.success) {
      showSuccess(t('auth.registerSuccess'));
      navigate('/');
    } else {
      const message = localizeRegisterError(result.error, isKorean);
      setError(message);
      showError(message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            border: '1px solid #E5E5E5',
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h5"
              sx={{ color: '#0047BA', fontWeight: 700, mb: 1 }}
            >
              {t('auth.register')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isKorean ? '국가대표 선수단 통합 플랫폼 회원가입' : 'Create your delegation platform account'}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Register Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={2}>
              {/* Name (Korean) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={isKorean ? '이름 (한글)' : 'Name (Korean)'}
                  {...register('name_ko', {
                    required: isKorean ? '이름을 입력해주세요' : 'Name is required',
                    validate: (value) => String(value || '').trim() !== '' || (isKorean ? '이름을 입력해주세요' : 'Name is required'),
                  })}
                  error={!!errors.name_ko}
                  helperText={errors.name_ko?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Name (English) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={isKorean ? '영문 이름' : 'Name (English)'}
                  {...register('name_en')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Email */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t('auth.email')}
                  type="email"
                  {...register('email', {
                    required: isKorean ? '이메일을 입력해주세요' : 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: isKorean ? '올바른 이메일 형식이 아닙니다' : 'Enter a valid email address',
                    },
                  })}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Phone */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('auth.phone')}
                  {...register('phone', {
                    pattern: {
                      value: /^[0-9-]+$/,
                      message: isKorean ? '올바른 전화번호 형식이 아닙니다' : 'Enter a valid phone number',
                    },
                  })}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  placeholder="010-1234-5678"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Employee ID */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('auth.employeeId')}
                  {...register('employee_id')}
                  placeholder={isKorean ? '사번 (선택)' : 'Employee ID (optional)'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Password */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: isKorean ? '비밀번호를 입력해주세요' : 'Password is required',
                    minLength: {
                      value: 8,
                      message: isKorean ? '비밀번호는 최소 8자 이상이어야 합니다' : 'Password must be at least 8 characters',
                    },
                  })}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Confirm Password */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={t('auth.confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: isKorean ? '비밀번호 확인을 입력해주세요' : 'Please confirm your password',
                    validate: (value) =>
                      value === password || (isKorean ? '비밀번호가 일치하지 않습니다' : 'Passwords do not match'),
                  })}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? (isKorean ? '가입 중...' : 'Signing up...') : t('auth.register')}
            </Button>
          </Box>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('auth.hasAccount')}{' '}
              <Link
                to="/login"
                style={{
                  color: '#0047BA',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                {t('auth.login')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
