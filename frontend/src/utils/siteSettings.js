import { useEffect, useState } from 'react';
import { siteSettingsAPI } from '../services/api';

export const DEFAULT_HOME_SETTINGS = {
  platformName: '2026 아이치-나고야 아시안게임 국가대표 선수단 플랫폼',
  platformNameEn: '2026 Aichi-Nagoya Asian Games Delegation Platform',
  logoImageUrl: '',
  heroEyebrow: '2026 아이치·나고야 아시안게임',
  heroTitle: '국가대표 선수단 통합 플랫폼',
  heroSubtitle: '훈련·상담·교육·운영 지원을 하나의 플랫폼에서 통합 관리합니다.',
  primaryButtonText: '로그인',
  secondaryButtonText: '회원가입',
  backgroundVideoUrl: 'https://videos.pexels.com/video-files/3191251/3191251-uhd_2560_1440_25fps.mp4',
  loginHelperText: '발급받은 계정 또는 아래 테스트 계정으로 로그인하세요.',
  testAccountsText: '지도자: coach@asiangames.com / demo1234\n선수: athlete@asiangames.com / demo1234',
  fontFamily: 'Inter, Arial, sans-serif',
  heroTitleSize: '4.4rem',
  heroTitleColor: '#FFFFFF',
  heroSubtitleSize: '1.25rem',
  heroSubtitleColor: '#FFFFFF',
  platformNameSize: '1.5rem',
  platformNameColor: '#0047BA',
};

const STORAGE_KEY = 'asiangames_home_cms';

export const mergeHomeSettings = (settings) => ({
  ...DEFAULT_HOME_SETTINGS,
  ...(settings && typeof settings === 'object' ? settings : {}),
});

export const getCachedHomeSettings = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? mergeHomeSettings(JSON.parse(cached)) : DEFAULT_HOME_SETTINGS;
  } catch {
    return DEFAULT_HOME_SETTINGS;
  }
};

export const cacheHomeSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeHomeSettings(settings)));
  } catch {
    // Ignore storage failures; API data still drives the current render.
  }
};

export const useHomeSettings = () => {
  const [settings, setSettings] = useState(getCachedHomeSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    siteSettingsAPI.getHome()
      .then((response) => {
        const next = mergeHomeSettings(response.data?.settings);
        cacheHomeSettings(next);
        if (mounted) setSettings(next);
      })
      .catch(() => {
        if (mounted) setSettings(getCachedHomeSettings());
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { settings, setSettings, loading };
};

// Test-account text shown on public login screens. Lines that advertise
// administrator credentials are never shown publicly.
export const getPublicTestAccountsText = (text) => (
  typeof text === 'string'
    ? text
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/admin@|관리자|\badmin\b/i.test(line))
      .join('\n')
    : ''
);
