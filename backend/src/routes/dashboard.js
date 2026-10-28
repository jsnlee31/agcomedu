const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const safeRows = async (sql, params = []) => {
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Dashboard query skipped:', error.message);
    return [];
  }
};

const safeCount = async (sql, params = []) => {
  const rows = await safeRows(sql, params);
  return Number(rows[0]?.count || 0);
};

router.get('/home', authenticate, async (req, res) => {
  try {
    const [
      appliedPrograms,
      scheduledConsultations,
      ongoingCourses,
      announcements,
      programs,
      jobs,
    ] = await Promise.all([
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM program_applications
         WHERE user_id = $1 AND COALESCE(status::text, 'pending') NOT IN ('cancelled', '취소')`,
        [req.user.id]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM consultations
         WHERE user_id = $1 AND COALESCE(status::text, '예약됨') NOT IN ('cancelled', '취소', 'completed', '완료', 'no_show', '노쇼')`,
        [req.user.id]
      ),
      safeCount(
        `SELECT COUNT(*)::int AS count
         FROM course_enrollments
         WHERE user_id = $1 AND COALESCE(is_completed, FALSE) = FALSE`,
        [req.user.id]
      ),
      safeRows(
        `SELECT id, title_ko, title_en, title_ko AS title, type, created_at
         FROM announcements
         WHERE COALESCE(is_active, TRUE) = TRUE
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      safeRows(
        `SELECT p.*,
          COALESCE((
            SELECT COUNT(*)::int
            FROM program_applications pa
            WHERE pa.program_id = p.id AND COALESCE(pa.status::text, 'pending') NOT IN ('cancelled', '취소')
          ), 0) AS current_participants
         FROM programs p
         ORDER BY p.recruitment_start DESC NULLS LAST, p.created_at DESC
         LIMIT 4`
      ),
      safeRows(
        `SELECT id, company_name, company_name AS company, title_ko, title_en, title_ko AS title, location, deadline, posted_at AS created_at
         FROM jobs
         WHERE COALESCE(is_active, TRUE) = TRUE
         ORDER BY posted_at DESC
         LIMIT 4`
      ),
    ]);

    res.json({
      user: req.user,
      stats: {
        appliedPrograms,
        scheduledConsultations,
        ongoingCourses,
      },
      announcements,
      programs,
      jobs,
    });
  } catch (error) {
    console.error('Dashboard home error:', error);
    res.json({
      user: req.user,
      stats: { appliedPrograms: 0, scheduledConsultations: 0, ongoingCourses: 0 },
      announcements: [],
      programs: [],
      jobs: [],
    });
  }
});

router.get('/stats', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const [users, courses, enrollments] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM users'),
      db.query('SELECT COUNT(*)::int AS count FROM courses'),
      db.query('SELECT COUNT(*)::int AS count FROM course_enrollments'),
    ]);
    res.json({
      users: users.rows[0].count,
      courses: courses.rows[0].count,
      enrollments: enrollments.rows[0].count,
    });
  } catch (error) {
    res.status(500).json({ error: '통계를 불러오지 못했습니다.' });
  }
});

router.get('/calendar', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_date ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

module.exports = router;
