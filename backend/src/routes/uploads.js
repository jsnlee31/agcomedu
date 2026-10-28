const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// Files are stored in Supabase Storage. The browser uploads directly to a
// signed URL so large videos never pass through the Vercel function, which
// has a ~4.5MB request body limit.
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'media';

const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

const storageFetch = (path, options = {}) => fetch(`${supabaseUrl()}/storage/v1${path}`, {
  ...options,
  headers: {
    apikey: serviceKey(),
    Authorization: `Bearer ${serviceKey()}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
});

let bucketReady;
const ensureBucket = () => {
  if (!bucketReady) {
    bucketReady = (async () => {
      const existing = await storageFetch(`/bucket/${BUCKET}`);
      if (existing.ok) {
        const info = await existing.json();
        if (!info.public) {
          await storageFetch(`/bucket/${BUCKET}`, { method: 'PUT', body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }) });
        }
        return;
      }
      const created = await storageFetch('/bucket', {
        method: 'POST',
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
      });
      if (!created.ok) {
        const text = await created.text();
        if (!/already exists|Duplicate/i.test(text)) throw new Error(`Bucket create failed: ${text}`);
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
};

const ALLOWED_FOLDERS = ['videos', 'images', 'documents', 'consultations'];

const safeFileName = (name = 'file') => {
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext ? `.${ext}` : ''}`;
};

router.get('/status', authenticate, (req, res) => {
  res.json({ enabled: Boolean(supabaseUrl() && serviceKey()), bucket: BUCKET });
});

// Returns a one-time signed URL the browser can PUT the file to, plus the
// public URL to save on the record once the upload finishes.
router.post('/sign', authenticate, authorize('admin', 'hr_manager', 'instructor'), async (req, res) => {
  try {
    if (!supabaseUrl() || !serviceKey()) {
      return res.status(503).json({ error: '파일 저장소(Supabase Storage)가 설정되지 않았습니다. SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경 변수를 확인하세요.' });
    }

    const { fileName, folder = 'videos' } = req.body || {};
    const targetFolder = ALLOWED_FOLDERS.includes(folder) ? folder : 'videos';
    const objectPath = `${targetFolder}/${safeFileName(fileName)}`;

    await ensureBucket();

    const signed = await storageFetch(`/object/upload/sign/${BUCKET}/${objectPath}`, { method: 'POST', body: '{}' });
    if (!signed.ok) {
      const text = await signed.text();
      console.error('Signed upload URL error:', text);
      return res.status(502).json({ error: '업로드 URL을 생성하지 못했습니다.' });
    }
    const { url } = await signed.json();

    res.json({
      uploadUrl: `${supabaseUrl()}/storage/v1${url}`,
      publicUrl: `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${objectPath}`,
      path: objectPath,
    });
  } catch (error) {
    console.error('Upload sign error:', error);
    res.status(500).json({ error: '업로드 준비 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
