const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const isAdmin = (user) => ['admin'].includes(user.role);
const blankToNull = (value) => (value === '' ? null : value);

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (category) {
      params.push(category);
      where += ` AND c.category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (c.title_ko ILIKE $${params.length} OR c.title_en ILIKE $${params.length})`;
    }

    const result = await db.query(
      `SELECT c.*, u.name_ko as instructor_name, u.email as instructor_email,
        COUNT(ce.id)::int as enrollment_count
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN course_enrollments ce ON ce.course_id = c.id
       ${where}
       GROUP BY c.id, u.name_ko, u.email
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ courses: result.rows });
  } catch (error) {
    console.error('Get courses error:', error);
    res.json({ courses: [] });
  }
});

router.get('/enrollments', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ce.*, c.title_ko, c.title_en, c.thumbnail_url
       FROM course_enrollments ce
       JOIN courses c ON c.id = ce.course_id
       WHERE ce.user_id = $1
       ORDER BY ce.last_accessed_at DESC NULLS LAST, ce.started_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: '수강 목록을 불러오지 못했습니다.' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.name_ko as instructor_name, u.email as instructor_email,
        COUNT(ce.id)::int as enrollment_count
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN course_enrollments ce ON ce.course_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.name_ko, u.email`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
    }

    await db.query('UPDATE courses SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: '강의를 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const {
      title_ko,
      title_en,
      description_ko,
      description_en,
      category,
      type = 'video',
      duration_minutes,
      thumbnail_url,
      video_url,
      document_url,
      file_size,
      is_featured = false,
      instructor_id,
    } = req.body;

    if (!blankToNull(title_ko)) {
      return res.status(400).json({ error: '강의명(국문)은 필수입니다.' });
    }

    const ownerId = isAdmin(req.user) && blankToNull(instructor_id) ? instructor_id : req.user.id;

    const result = await db.query(
      `INSERT INTO courses (
        title_ko, title_en, description_ko, description_en, category, type,
        duration_minutes, thumbnail_url, video_url, document_url, file_size,
        is_featured, instructor_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title_ko, blankToNull(title_en), blankToNull(description_ko), blankToNull(description_en), blankToNull(category), blankToNull(type),
        blankToNull(duration_minutes), blankToNull(thumbnail_url), blankToNull(video_url), blankToNull(document_url), blankToNull(file_size),
        blankToNull(is_featured) ?? false, ownerId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: '강의 생성에 실패했습니다.', detail: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const course = await db.query('SELECT instructor_id FROM courses WHERE id = $1', [req.params.id]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
    }

    if (!isAdmin(req.user) && course.rows[0].instructor_id !== req.user.id) {
      return res.status(403).json({ error: '담당 강사 또는 관리자만 수정할 수 있습니다.' });
    }

    const {
      title_ko, title_en, description_ko, description_en, category, type,
      duration_minutes, thumbnail_url, video_url, document_url, file_size,
      is_featured, instructor_id,
    } = req.body;

    const result = await db.query(
      `UPDATE courses SET
        title_ko = COALESCE($1, title_ko),
        title_en = COALESCE($2, title_en),
        description_ko = COALESCE($3, description_ko),
        description_en = COALESCE($4, description_en),
        category = COALESCE($5, category),
        type = COALESCE($6, type),
        duration_minutes = COALESCE($7, duration_minutes),
        thumbnail_url = COALESCE($8, thumbnail_url),
        video_url = COALESCE($9, video_url),
        document_url = COALESCE($10, document_url),
        file_size = COALESCE($11, file_size),
        is_featured = COALESCE($12, is_featured),
        instructor_id = COALESCE($13, instructor_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        blankToNull(title_ko), blankToNull(title_en), blankToNull(description_ko), blankToNull(description_en), blankToNull(category), blankToNull(type),
        blankToNull(duration_minutes), blankToNull(thumbnail_url), blankToNull(video_url), blankToNull(document_url), blankToNull(file_size),
        blankToNull(is_featured), isAdmin(req.user) ? blankToNull(instructor_id) : undefined, req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: '강의 수정에 실패했습니다.', detail: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM courses WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' });
    }
    res.json({ message: '강의가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: '강의 삭제에 실패했습니다.' });
  }
});

router.post('/:id/enroll', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO course_enrollments (user_id, course_id, last_accessed_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET last_accessed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    const count = await db.query(
      'SELECT COUNT(*)::int AS enrollment_count FROM course_enrollments WHERE course_id = $1',
      [req.params.id]
    );
    res.status(201).json({ ...result.rows[0], enrollment_count: count.rows[0].enrollment_count });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ error: '수강 신청에 실패했습니다.' });
  }
});

router.delete('/:id/enroll', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM course_enrollments WHERE user_id = $1 AND course_id = $2 RETURNING *',
      [req.user.id, req.params.id]
    );
    const count = await db.query(
      'SELECT COUNT(*)::int AS enrollment_count FROM course_enrollments WHERE course_id = $1',
      [req.params.id]
    );
    res.json({
      removed: result.rows.length > 0,
      enrollment_count: count.rows[0].enrollment_count
    });
  } catch (error) {
    console.error('Unenroll course error:', error);
    res.status(500).json({ error: '수강 취소에 실패했습니다.' });
  }
});

router.put('/:id/progress', authenticate, async (req, res) => {
  try {
    const { progress_percent = 0, is_completed = false } = req.body;
    const result = await db.query(
      `INSERT INTO course_enrollments (user_id, course_id, progress_percent, is_completed, last_accessed_at, completed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END)
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET progress_percent = $3, is_completed = $4, last_accessed_at = CURRENT_TIMESTAMP,
         completed_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE course_enrollments.completed_at END
       RETURNING *`,
      [req.user.id, req.params.id, Number(progress_percent) || 0, Boolean(is_completed) && is_completed !== 'false']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update course progress error:', error);
    res.status(500).json({ error: '학습 진도 저장에 실패했습니다.' });
  }
});

module.exports = router;
