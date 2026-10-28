import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import AsianGamesCursorIcon from '../../components/common/AsianGamesCursorIcon';
import { getPublicTestAccountsText, useHomeSettings } from '../../utils/siteSettings';
import { useIsKorean } from '../../utils/language';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError } = useNotification();
  const { settings } = useHomeSettings();
  const isKorean = useIsKorean();
  const testAccountsText = getPublicTestAccountsText(settings.testAccountsText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    const result = await login(String(data.email || '').trim(), data.password);
    setLoading(false);
    if (result.success) {
      navigate('/');
      return;
    }
    const message = result.error || (isKorean ? '로그인에 실패했습니다.' : 'Login failed.');
    setError(message);
    showError(message);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#F8F9FA', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: '1px solid #E5E5E5' }}>
          <Box sx={{ mb: 2 }}>
            <AsianGamesCursorIcon compact />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary" align="center">
            {isKorean ? '2026 아이치·나고야 아시안게임' : '2026 Aichi-Nagoya Asian Games'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {isKorean ? '국가대표 선수단 통합 플랫폼' : 'National Team Delegation Platform'}
          </Typography>
          {testAccountsText && (
            <Alert severity="info" sx={{ mb: 3, whiteSpace: 'pre-line', wordBreak: 'break-all' }}>
              {testAccountsText}
            </Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              fullWidth
              label={isKorean ? '이메일' : 'Email'}
              type="email"
              autoComplete="email"
              sx={{ mb: 2 }}
              {...register('email', {
                required: isKorean ? '이메일을 입력하세요.' : 'Email is required.',
                pattern: { value: EMAIL_PATTERN, message: isKorean ? '올바른 이메일 형식이 아닙니다.' : 'Enter a valid email address.' },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              fullWidth
              label={isKorean ? '비밀번호' : 'Password'}
              type="password"
              autoComplete="current-password"
              sx={{ mb: 3 }}
              {...register('password', { required: isKorean ? '비밀번호를 입력하세요.' : 'Password is required.' })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}>
              {loading ? (isKorean ? '로그인 중...' : 'Signing in...') : (isKorean ? '로그인' : 'Sign In')}
            </Button>
          </Box>
          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            <Link to="/register">{isKorean ? '회원가입' : 'Create account'}</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
