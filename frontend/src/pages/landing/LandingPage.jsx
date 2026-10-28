import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import AsianGamesCursorIcon from '../../components/common/AsianGamesCursorIcon';
import { getPublicTestAccountsText, useHomeSettings } from '../../utils/siteSettings';
import { useIsKorean } from '../../utils/language';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LandingPage = () => {
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
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.35fr) 430px' },
        bgcolor: '#07111F',
      }}
    >
      {settings.backgroundVideoUrl && (
        <Box
          component="video"
          src={settings.backgroundVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.52,
            filter: 'saturate(1.12) contrast(1.05)',
          }}
        />
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(3,10,25,0.9) 0%, rgba(0,58,112,0.66) 48%, rgba(248,249,250,0.92) 100%)',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 3, sm: 5, md: 7 },
          minHeight: { xs: '58vh', md: '100vh' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#fff',
          minWidth: 0,
        }}
      >
        <Box sx={{ width: { xs: 230, sm: 300, md: 330 }, maxWidth: '100%', mb: { xs: 3, md: 5 } }}>
          <AsianGamesCursorIcon />
        </Box>
        <Typography variant="overline" sx={{ opacity: 0.86, letterSpacing: '0.14em' }}>
          {settings.heroEyebrow}
        </Typography>
        <Typography
          component="h1"
          sx={{
            maxWidth: 860,
            fontWeight: 900,
            fontSize: { xs: '2.1rem', sm: '3.5rem', md: settings.heroTitleSize },
            color: settings.heroTitleColor,
            fontFamily: settings.fontFamily,
            lineHeight: 0.98,
            wordBreak: 'keep-all',
            mt: 1,
            mb: 2,
          }}
        >
          {settings.heroTitle}
        </Typography>
        <Typography
          sx={{
            maxWidth: 740,
            opacity: 0.92,
            lineHeight: 1.55,
            wordBreak: 'keep-all',
            fontSize: { xs: '1rem', sm: settings.heroSubtitleSize },
            color: settings.heroSubtitleColor,
            fontFamily: settings.fontFamily,
          }}
        >
          {settings.heroSubtitle}
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 2, sm: 4 },
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <Paper elevation={0} sx={{ width: '100%', p: { xs: 3, sm: 4 }, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, backdropFilter: 'blur(18px)', bgcolor: 'rgba(255,255,255,0.94)' }}>
          <Typography fontWeight={800} align="center" sx={{ fontSize: settings.platformNameSize, color: settings.platformNameColor, fontFamily: settings.fontFamily, wordBreak: 'keep-all', mb: settings.loginHelperText ? 0 : 3 }}>
            {isKorean ? (settings.platformName || settings.platformNameEn) : (settings.platformNameEn || settings.platformName)}
          </Typography>
          {settings.loginHelperText && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 3 }}>
              {settings.loginHelperText}
            </Typography>
          )}
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
              {loading
                ? (isKorean ? '로그인 중...' : 'Signing in...')
                : (settings.primaryButtonText || (isKorean ? '로그인' : 'Sign In'))}
            </Button>
          </Box>
          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            <Link to="/register">{settings.secondaryButtonText || (isKorean ? '회원가입' : 'Create account')}</Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default LandingPage;
