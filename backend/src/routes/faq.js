const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const blankToNull = (value) => (value === '' ? null : value);

router.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM faq_categories ORDER BY sort_order, name_ko');
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

router.post('/categories', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name_ko, name_en, sort_order = 0 } = req.body;
    if (!String(name_ko || '').trim()) {
      return res.status(400).json({ error: '카테고리명(국문)을 입력해 주세요.' });
    }
    const result = await db.query(
      'INSERT INTO faq_categories (name_ko, name_en, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [blankToNull(name_ko), blankToNull(name_en), blankToNull(sort_order) ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '카테고리 생성에 실패했습니다.' });
  }
});

router.put('/categories/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name_ko, name_en, sort_order } = req.body;
    const result = await db.query(
      `UPDATE faq_categories SET
        name_ko = COALESCE($1, name_ko),
        name_en = COALESCE($2, name_en),
        sort_order = COALESCE($3, sort_order)
       WHERE id = $4
       RETURNING *`,
      [blankToNull(name_ko), blankToNull(name_en), blankToNull(sort_order), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '카테고리 수정에 실패했습니다.' });
  }
});

router.delete('/categories/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM faq_categories WHERE id = $1', [req.params.id]);
    res.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '카테고리 삭제에 실패했습니다.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, fc.name_ko as category_name
       FROM faqs f LEFT JOIN faq_categories fc ON fc.id = f.category_id
       WHERE COALESCE(f.is_active, TRUE) = TRUE
       ORDER BY fc.sort_order, f.sort_order, f.created_at DESC`
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    res.json({ faqs: [] });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM faqs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'FAQ를 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { category_id, question_ko, question_en, answer_ko, answer_en, sort_order = 0, is_active = true } = req.body;
    if (!String(question_ko || '').trim() || !String(answer_ko || '').trim()) {
      return res.status(400).json({ error: '질문과 답변(국문)을 입력해 주세요.' });
    }
    const result = await db.query(
      `INSERT INTO faqs (category_id, question_ko, question_en, answer_ko, answer_en, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [blankToNull(category_id), question_ko, blankToNull(question_en), answer_ko, blankToNull(answer_en), blankToNull(sort_order) ?? 0, blankToNull(is_active) ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'FAQ 등록에 실패했습니다.', detail: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      category_id,
      question_ko,
      question_en,
      answer_ko,
      answer_en,
      sort_order,
      is_active,
    } = req.body;

    const result = await db.query(
      `UPDATE faqs SET
        category_id = COALESCE($1, category_id),
        question_ko = COALESCE($2, question_ko),
        question_en = COALESCE($3, question_en),
        answer_ko = COALESCE($4, answer_ko),
        answer_en = COALESCE($5, answer_en),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [
        blankToNull(category_id), blankToNull(question_ko), blankToNull(question_en), blankToNull(answer_ko), blankToNull(answer_en),
        blankToNull(sort_order), blankToNull(is_active), req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ를 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'FAQ 수정에 실패했습니다.', detail: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('UPDATE faqs SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'FAQ가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: 'FAQ 삭제에 실패했습니다.' });
  }
});

module.exports = router;
