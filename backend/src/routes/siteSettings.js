const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const SETTING_KEY = 'home_cms';

const DEFAULT_SETTINGS = {
  platformName: '2026 우수선수 육성인력 교육',
  platformNameEn: '2026 Elite Athlete Development Staff Training',
  logoImageUrl: '/logo.png',
  heroEyebrow: 'NO SPORTS NO FUTURE',
  heroTitle: '우수선수 육성인력 교육',
  heroSubtitle: '\uD6C8\uB828\u00B7\uC0C1\uB2F4\u00B7\uAD50\uC721\u00B7\uC6B4\uC601 \uC9C0\uC6D0\uC744 \uD558\uB098\uC758 \uD50C\uB7AB\uD3FC\uC5D0\uC11C \uD1B5\uD569 \uAD00\uB9AC\uD569\uB2C8\uB2E4.',
  primaryButtonText: '\uB85C\uADF8\uC778',
  secondaryButtonText: '\uD68C\uC6D0\uAC00\uC785',
  backgroundVideoUrl: 'https://videos.pexels.com/video-files/3191251/3191251-uhd_2560_1440_25fps.mp4',
  loginHelperText: '\uBC1C\uAE09\uBC1B\uC740 \uACC4\uC815 \uB610\uB294 \uC544\uB798 \uD14C\uC2A4\uD2B8 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uC138\uC694.',
  testAccountsText: '\uC9C0\uB3C4\uC790: coach@asiangames.com / demo1234\n\uC120\uC218: athlete@asiangames.com / demo1234',
  fontFamily: 'Inter, Arial, sans-serif',
  heroTitleSize: '4.4rem',
  heroTitleColor: '#FFFFFF',
  heroSubtitleSize: '1.25rem',
  heroSubtitleColor: '#FFFFFF',
  platformNameSize: '1.5rem',
  platformNameColor: '#0047BA',
};

const cleanSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...Object.fromEntries(
    Object.entries(settings).filter(([, value]) => typeof value === 'string')
  ),
});

router.get('/home', async (req, res) => {
  try {
    const result = await db.query('SELECT value FROM site_settings WHERE key = $1', [SETTING_KEY]);
    res.json({ settings: cleanSettings(result.rows[0]?.value) });
  } catch (error) {
    console.error('Get site settings error:', error);
    res.json({ settings: DEFAULT_SETTINGS });
  }
});

router.put('/home', authenticate, authorize('admin'), async (req, res) => {
  try {
    const settings = cleanSettings(req.body || {});
    const result = await db.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
       RETURNING value, updated_at`,
      [SETTING_KEY, JSON.stringify(settings)]
    );
    res.json({ settings: result.rows[0].value, updated_at: result.rows[0].updated_at });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({ error: '사이트 설정 저장에 실패했습니다.', detail: error.message });
  }
});

module.exports = router;
