const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const jsonContent = (content) => JSON.stringify(content && typeof content === 'object' ? content : {});
const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
const errorResponse = (res, error, message) => {
  return res.status(500).json({ error: message, detail: error.message });
};

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get resumes error:', error);
    errorResponse(res, error, '이력서 목록을 불러오지 못했습니다.');
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '이력서를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    errorResponse(res, error, '이력서를 불러오지 못했습니다.');
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, file_url, is_primary = false } = req.body;
    if (is_primary) {
      await db.query('UPDATE resumes SET is_primary = FALSE WHERE user_id = $1', [req.user.id]);
    }
    const result = await db.query(
      `INSERT INTO resumes (user_id, title, content, file_url, is_primary)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, clean(title) || 'Untitled resume', jsonContent(content), clean(file_url), Boolean(is_primary)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create resume error:', error);
    errorResponse(res, error, '이력서 저장에 실패했습니다.');
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, content, file_url, is_primary } = req.body;
    if (is_primary) {
      await db.query('UPDATE resumes SET is_primary = FALSE WHERE user_id = $1', [req.user.id]);
    }
    const result = await db.query(
      `UPDATE resumes SET title = COALESCE($1, title), content = COALESCE($2, content),
       file_url = COALESCE($3, file_url), is_primary = COALESCE($4, is_primary),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [clean(title), content === undefined ? null : jsonContent(content), clean(file_url), is_primary, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '이력서를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update resume error:', error);
    errorResponse(res, error, '이력서 수정에 실패했습니다.');
  }
});

router.put('/:id/primary', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE resumes SET is_primary = FALSE WHERE user_id = $1', [req.user.id]);
    const result = await db.query(
      'UPDATE resumes SET is_primary = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '이력서를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    errorResponse(res, error, '대표 이력서 설정에 실패했습니다.');
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM resumes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '이력서를 찾을 수 없습니다.' });
    res.json({ message: '이력서가 삭제되었습니다.' });
  } catch (error) {
    errorResponse(res, error, '이력서 삭제에 실패했습니다.');
  }
});

module.exports = router;
