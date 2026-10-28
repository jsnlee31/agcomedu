const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
const errorResponse = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ error: message, detail: error.message });
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM jobs WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY posted_at DESC');
    res.json({ jobs: result.rows });
  } catch (error) {
    res.json({ jobs: [] });
  }
});

router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM jobs WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY posted_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

router.get('/bookmarks', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.* FROM job_bookmarks jb JOIN jobs j ON j.id = jb.job_id WHERE jb.user_id = $1 ORDER BY jb.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.*,
              CASE WHEN $2::uuid IS NULL THEN FALSE
                   ELSE EXISTS (SELECT 1 FROM job_bookmarks jb WHERE jb.job_id = j.id AND jb.user_id = $2::uuid)
              END AS is_bookmarked
       FROM jobs j WHERE j.id = $1`,
      [req.params.id, req.user ? req.user.id : null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '채용 공고를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '채용 공고를 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { company_name, title_ko, title_en, description_ko, description_en, category, employment_type, location, salary_range, requirements, benefits, contact_info, external_url, deadline } = req.body;
    if (!clean(company_name) || !clean(title_ko)) {
      return res.status(400).json({ error: '회사명과 공고 제목(국문)은 필수입니다.' });
    }
    const result = await db.query(
      `INSERT INTO jobs (company_name, title_ko, title_en, description_ko, description_en, category, employment_type, location, salary_range, requirements, benefits, contact_info, external_url, deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [clean(company_name), clean(title_ko), clean(title_en), clean(description_ko), clean(description_en), clean(category), clean(employment_type), clean(location), clean(salary_range), clean(requirements), clean(benefits), clean(contact_info), clean(external_url), clean(deadline)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    errorResponse(res, error, '채용 공고 등록에 실패했습니다.');
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Blank strings become NULL exactly like POST. Fields present in the body
    // are written (so optional fields can be cleared); required fields and
    // is_active keep their current value when blank.
    const optionalFields = ['title_en', 'description_ko', 'description_en', 'category', 'employment_type', 'location', 'salary_range', 'requirements', 'benefits', 'contact_info', 'external_url', 'deadline'];
    const keepWhenBlank = ['company_name', 'title_ko', 'is_active'];
    const sets = [];
    const params = [];

    for (const field of keepWhenBlank) {
      const value = clean(req.body[field]);
      if (value !== undefined && value !== null) {
        params.push(value);
        sets.push(`${field} = $${params.length}`);
      }
    }
    for (const field of optionalFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        params.push(clean(req.body[field]));
        sets.push(`${field} = $${params.length}`);
      }
    }

    params.push(req.params.id);
    const result = sets.length
      ? await db.query(`UPDATE jobs SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params)
      : await db.query('SELECT * FROM jobs WHERE id = $1', params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '채용 공고를 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    errorResponse(res, error, '채용 공고 수정에 실패했습니다.');
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('UPDATE jobs SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: '채용 공고가 삭제되었습니다.' });
  } catch (error) {
    errorResponse(res, error, '채용 공고 삭제에 실패했습니다.');
  }
});

router.post('/:id/bookmark', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO job_bookmarks (user_id, job_id) VALUES ($1, $2)
       ON CONFLICT (user_id, job_id) DO NOTHING RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.status(201).json(result.rows[0] || { bookmarked: true });
  } catch (error) {
    res.status(500).json({ error: '북마크에 실패했습니다.' });
  }
});

router.delete('/:id/bookmark', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM job_bookmarks WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    res.json({ message: '북마크가 해제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '북마크 해제에 실패했습니다.' });
  }
});

router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const { resume_id, cover_letter } = req.body;
    const result = await db.query(
      'INSERT INTO job_applications (user_id, job_id, resume_id, cover_letter) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, req.params.id, resume_id, cover_letter]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    errorResponse(res, error, '신청에 실패했습니다.');
  }
});

module.exports = router;
