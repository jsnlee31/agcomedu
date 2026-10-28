import React from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { siteSettingsAPI } from '../../services/api';
import AsianGamesCursorIcon from '../../components/common/AsianGamesCursorIcon';
import FileUploadButton from '../../components/common/FileUploadButton';
import {
  cacheHomeSettings,
  DEFAULT_HOME_SETTINGS,
  mergeHomeSettings,
  useHomeSettings,
} from '../../utils/siteSettings';

const fontOptions = [
  'Inter, Arial, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  'Tahoma, sans-serif',
  'Verdana, sans-serif',
];

const BannerManagement = () => {
  const { showSuccess, showError } = useNotification();
  const { settings, setSettings, loading } = useHomeSettings();

  const updateField = (field, value) => {
    setSettings((current) => mergeHomeSettings({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = mergeHomeSettings(settings);
      const response = await siteSettingsAPI.updateHome(payload);
      const saved = mergeHomeSettings(response.data?.settings || payload);
      setSettings(saved);
      cacheHomeSettings(saved);
      showSuccess('홈 화면 설정이 저장되었습니다.');
    } catch (error) {
      showError(error.response?.data?.detail || error.response?.data?.error || '사이트 설정을 저장하지 못했습니다.');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>홈 화면 관리 (CMS)</Typography>
          <Typography variant="body2" color="text.secondary">
            첫 화면(Welcome)의 로고, 문구, 글꼴, 크기, 색상, 배경 영상을 직접 수정합니다.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ResetIcon />} onClick={() => setSettings(DEFAULT_HOME_SETTINGS)}>
            기본값으로
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading}>
            저장
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>브랜드</Typography>
            <TextField fullWidth label="플랫폼 이름" value={settings.platformName} onChange={(e) => updateField('platformName', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="영문 / 모바일 플랫폼 이름" value={settings.platformNameEn} onChange={(e) => updateField('platformNameEn', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="로고 이미지 URL" value={settings.logoImageUrl} onChange={(e) => updateField('logoImageUrl', e.target.value)} placeholder="비워두면 기본 로고가 표시됩니다" sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <FileUploadButton accept="image/*" folder="images" maxSizeMB={10} label="로고 업로드" onUploaded={(url) => updateField('logoImageUrl', url)} />
              <Button onClick={() => updateField('logoImageUrl', '')}>기본 로고 사용</Button>
            </Box>

            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>환영 문구</Typography>
            <TextField fullWidth label="상단 작은 문구" value={settings.heroEyebrow} onChange={(e) => updateField('heroEyebrow', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="메인 제목" value={settings.heroTitle} onChange={(e) => updateField('heroTitle', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth multiline minRows={3} label="부제목" value={settings.heroSubtitle} onChange={(e) => updateField('heroSubtitle', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="배경 영상 URL" value={settings.backgroundVideoUrl} onChange={(e) => updateField('backgroundVideoUrl', e.target.value)} helperText="MP4 영상 주소를 입력하거나 아래 버튼으로 영상을 업로드하세요." sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <FileUploadButton accept="video/mp4,video/webm,video/*" folder="videos" maxSizeMB={500} label="배경 영상 업로드" onUploaded={(url) => updateField('backgroundVideoUrl', url)} />
              <Button onClick={() => updateField('backgroundVideoUrl', '')}>영상 없이 사용</Button>
            </Box>

            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>로그인 영역</Typography>
            <TextField fullWidth label="로그인 안내 문구" value={settings.loginHelperText} onChange={(e) => updateField('loginHelperText', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth multiline minRows={4} label="테스트 계정 안내 (비워두면 숨김)" value={settings.testAccountsText} onChange={(e) => updateField('testAccountsText', e.target.value)} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="로그인 버튼 문구" value={settings.primaryButtonText} onChange={(e) => updateField('primaryButtonText', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="회원가입 링크 문구" value={settings.secondaryButtonText} onChange={(e) => updateField('secondaryButtonText', e.target.value)} />
              </Grid>
            </Grid>

            <Typography variant="h6" fontWeight={800} sx={{ mt: 3, mb: 2 }}>글꼴 및 색상</Typography>
            <TextField select fullWidth label="글꼴" value={settings.fontFamily} onChange={(e) => updateField('fontFamily', e.target.value)} sx={{ mb: 2 }}>
              {fontOptions.map((font) => <MenuItem key={font} value={font}>{font}</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="제목 크기" value={settings.heroTitleSize} onChange={(e) => updateField('heroTitleSize', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">CSS</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth type="color" label="제목 색상" value={settings.heroTitleColor} onChange={(e) => updateField('heroTitleColor', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="부제목 크기" value={settings.heroSubtitleSize} onChange={(e) => updateField('heroSubtitleSize', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">CSS</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth type="color" label="부제목 색상" value={settings.heroSubtitleColor} onChange={(e) => updateField('heroSubtitleColor', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="플랫폼 이름 크기" value={settings.platformNameSize} onChange={(e) => updateField('platformNameSize', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">CSS</InputAdornment> }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth type="color" label="플랫폼 이름 색상" value={settings.platformNameColor} onChange={(e) => updateField('platformNameColor', e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, position: { md: 'sticky' }, top: 80 }}>
            <Alert severity="info" sx={{ mb: 2 }}>실시간 미리보기입니다. [저장]을 눌러야 실제 첫 화면에 반영됩니다.</Alert>
            <Box sx={{ minHeight: { xs: 480, md: 660 }, borderRadius: 2, overflow: 'hidden', position: 'relative', bgcolor: '#07111F', color: '#fff', display: 'grid', gridTemplateRows: '1fr auto' }}>
              {settings.backgroundVideoUrl && (
                <Box component="video" src={settings.backgroundVideoUrl} autoPlay muted loop playsInline sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.48 }} />
              )}
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,10,25,0.5), rgba(0,0,0,0.88))' }} />
              <Box sx={{ position: 'relative', zIndex: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {settings.logoImageUrl ? (
                  <Box sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.96)', borderRadius: 2, px: 1.5, py: 1, mb: 2 }}>
                    <Box component="img" src={settings.logoImageUrl} alt="로고 미리보기" sx={{ display: 'block', height: 64, width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                  </Box>
                ) : (
                  <Box sx={{ width: 190, mb: 2 }}>
                    <AsianGamesCursorIcon compact={false} interactive={false} />
                  </Box>
                )}
                <Typography variant="overline" sx={{ opacity: 0.85, fontFamily: settings.fontFamily }}>{settings.heroEyebrow}</Typography>
                <Typography sx={{ fontWeight: 900, lineHeight: 1, mt: 1, mb: 1.5, fontFamily: settings.fontFamily, fontSize: settings.heroTitleSize, color: settings.heroTitleColor }}>
                  {settings.heroTitle}
                </Typography>
                <Typography sx={{ opacity: 0.92, lineHeight: 1.55, fontFamily: settings.fontFamily, fontSize: settings.heroSubtitleSize, color: settings.heroSubtitleColor }}>
                  {settings.heroSubtitle}
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', zIndex: 1, m: 3, bgcolor: 'rgba(255,255,255,0.95)', color: 'text.primary', borderRadius: 2, p: 2 }}>
                <Typography fontWeight={800} sx={{ fontFamily: settings.fontFamily, fontSize: settings.platformNameSize, color: settings.platformNameColor }}>
                  {settings.platformName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{settings.loginHelperText}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BannerManagement;
