const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
const cleanRoles = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return Array.isArray(value) ? value : String(value).split(',').map((role) => role.trim()).filter(Boolean);
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    // Admins managing notices (?all=true) also see hidden ones so they can re-enable them.
    const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
    const result = await db.query(
      `SELECT * FROM announcements
       ${includeInactive ? '' : 'WHERE COALESCE(is_active, TRUE) = TRUE'}
       ORDER BY is_pinned DESC, created_at DESC`
    );
    res.json({ announcements: result.rows });
  } catch (error) {
    res.json({ announcements: [] });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM announcements WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '공지사항을 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title_ko, title_en, content_ko, content_en, type, display_type, is_pinned = false, is_active = true, start_date, end_date, target_roles } = req.body;
    if (!clean(title_ko)) {
      return res.status(400).json({ error: '공지 제목(국문)은 필수입니다.' });
    }
    const result = await db.query(
      `INSERT INTO announcements (title_ko, title_en, content_ko, content_en, type, display_type, is_pinned, is_active, start_date, end_date, target_roles, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [clean(title_ko), clean(title_en), clean(content_ko), clean(content_en), clean(type), clean(display_type) || 'list', clean(is_pinned) ?? false, clean(is_active) ?? true, clean(start_date), clean(end_date), cleanRoles(target_roles), req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '공지사항 등록에 실패했습니다.' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      title_ko,
      title_en,
      content_ko,
      content_en,
      type,
      display_type,
      is_pinned,
      is_active,
      start_date,
      end_date,
      target_roles,
    } = req.body;

    const result = await db.query(
      `UPDATE announcements SET
        title_ko = COALESCE($1, title_ko),
        title_en = COALESCE($2, title_en),
        content_ko = COALESCE($3, content_ko),
        content_en = COALESCE($4, content_en),
        type = COALESCE($5, type),
        display_type = COALESCE($6, display_type),
        is_pinned = COALESCE($7, is_pinned),
        is_active = COALESCE($8, is_active),
        start_date = COALESCE($9, start_date),
        end_date = COALESCE($10, end_date),
        target_roles = COALESCE($11, target_roles),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        clean(title_ko), clean(title_en), clean(content_ko), clean(content_en), clean(type), clean(display_type),
        clean(is_pinned), clean(is_active), clean(start_date), clean(end_date), cleanRoles(target_roles), req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: '공지사항 수정에 실패했습니다.' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Hiding is done with the is_active switch; delete removes the notice.
    await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '공지사항 삭제에 실패했습니다.' });
  }
});

router.post('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query(
      `INSERT INTO announcement_reads (user_id, announcement_id)
       VALUES ($1, $2) ON CONFLICT (user_id, announcement_id) DO UPDATE SET read_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.params.id]
    );
    res.json({ message: '읽음 처리되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '읽음 처리에 실패했습니다.' });
  }
});

module.exports = router;
