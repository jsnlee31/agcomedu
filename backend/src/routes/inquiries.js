const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inquiries WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, u.name_ko as user_name, u.email
       FROM inquiries i LEFT JOIN users u ON u.id = i.user_id
       ORDER BY i.created_at DESC`
    );
    res.json({ inquiries: result.rows });
  } catch (error) {
    res.json({ inquiries: [] });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inquiries WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '문의를 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { category, title, content } = req.body;
    if (!String(title || '').trim() || !String(content || '').trim()) {
      return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });
    }
    const result = await db.query(
      'INSERT INTO inquiries (user_id, category, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, category, title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '문의 등록에 실패했습니다.' });
  }
});

router.put('/:id/respond', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { response } = req.body;
    const result = await db.query(
      `UPDATE inquiries SET response = $1, responded_by = $2, responded_at = CURRENT_TIMESTAMP, status = 'completed'
       WHERE id = $3 RETURNING *`,
      [response, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '답변 등록에 실패했습니다.' });
  }
});

module.exports = router;
