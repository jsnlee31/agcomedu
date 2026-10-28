const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Accept legacy English values from older clients.
const CONSULTATION_ALIASES = {
  online: '온라인', offline: '오프라인', phone: '전화',
  scheduled: '예약됨', pending: '예약됨', completed: '완료',
  cancelled: '취소', canceled: '취소', no_show: '노쇼',
};
const toKorean = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return CONSULTATION_ALIASES[String(value).toLowerCase()] || value;
};

const AVAILABILITY_COLUMNS = `ca.id, ca.consultant_id, ca.available_date,
  to_char(ca.start_time, 'HH24:MI') AS start_time,
  to_char(ca.end_time, 'HH24:MI') AS end_time,
  ca.is_booked, ca.consultation_id, ca.created_at`;

// ─── Get user's consultations ────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, u.name_ko as consultant_name, u.department as consultant_department
      FROM consultations c
      LEFT JOIN users u ON c.consultant_id = u.id
      WHERE c.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY c.scheduled_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ error: '상담 목록을 불러오지 못했습니다.' });
  }
});

// ─── Get all consultations (admin/consultant) ────────────────────────────────
router.get('/all', authenticate, authorize('admin', 'instructor', 'hr_manager'), async (req, res) => {
  try {
    const { status, consultant_id, date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*,
             u.name_ko as user_name, u.email as user_email,
             cu.name_ko as consultant_name
      FROM consultations c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users cu ON c.consultant_id = cu.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }
    if (consultant_id) {
      query += ` AND c.consultant_id = $${paramIndex++}`;
      params.push(consultant_id);
    }
    if (date) {
      query += ` AND DATE(c.scheduled_at) = $${paramIndex++}`;
      params.push(date);
    }

    query += ` ORDER BY c.scheduled_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all consultations error:', error);
    res.status(500).json({ error: '상담 목록을 불러오지 못했습니다.' });
  }
});

// ─── Get available consultants ───────────────────────────────────────────────
router.get('/consultants', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name_ko, u.name_en, u.department, u.position, u.profile_image,
              COUNT(c.id) FILTER (WHERE c.status = '완료') as completed_consultations
       FROM users u
       LEFT JOIN consultations c ON c.consultant_id = u.id
       WHERE u.role IN ('instructor', 'hr_manager') AND u.status = 'active'
       GROUP BY u.id
       ORDER BY u.name_ko`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get consultants error:', error);
    res.status(500).json({ error: '상담사 목록을 불러오지 못했습니다.' });
  }
});

// ─── Admin: Consultation statistics matrix ───────────────────────────────────
router.get('/admin/stats', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const matrix = await db.query(
      `SELECT
         cu.id as consultant_id,
         cu.name_ko as consultant_name,
         cu.department,
         COUNT(c.id) as total,
         COUNT(c.id) FILTER (WHERE c.status = '완료') as completed,
         COUNT(c.id) FILTER (WHERE c.status = '예약됨') as scheduled,
         COUNT(c.id) FILTER (WHERE c.status = '취소') as cancelled,
         COUNT(c.id) FILTER (WHERE c.status = '노쇼') as no_show,
         COUNT(c.id) FILTER (WHERE c.method = '온라인') as online_count,
         COUNT(c.id) FILTER (WHERE c.method = '오프라인') as offline_count,
         COUNT(c.id) FILTER (WHERE c.method = '전화') as call_count
       FROM users cu
       LEFT JOIN consultations c ON c.consultant_id = cu.id
       WHERE cu.role IN ('instructor', 'hr_manager') AND cu.status = 'active'
       GROUP BY cu.id, cu.name_ko, cu.department
       ORDER BY total DESC`
    );

    const summary = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = '완료') as completed,
         COUNT(*) FILTER (WHERE status = '예약됨') as scheduled,
         COUNT(*) FILTER (WHERE status = '취소') as cancelled
       FROM consultations`
    );

    res.json({ matrix: matrix.rows, summary: summary.rows[0] });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: '통계를 불러오지 못했습니다.' });
  }
});

// ─── Admin: Get consultations for a specific consultant ──────────────────────
router.get('/admin/by-consultant/:consultantId', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*,
              u.name_ko as user_name, u.email as user_email,
              cu.name_ko as consultant_name
       FROM consultations c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN users cu ON c.consultant_id = cu.id
       WHERE c.consultant_id = $1
       ORDER BY c.scheduled_at DESC`,
      [req.params.consultantId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get consultant consultations error:', error);
    res.status(500).json({ error: '상담 목록을 불러오지 못했습니다.' });
  }
});

// ─── Get consultant availability ─────────────────────────────────────────────
router.get('/availability/:consultantId', authenticate, async (req, res) => {
  try {
    const { consultantId } = req.params;
    const { date_from, date_to } = req.query;

    let query = `
      SELECT ${AVAILABILITY_COLUMNS}, u.name_ko as consultant_name
      FROM consultant_availability ca
      JOIN users u ON ca.consultant_id = u.id
      WHERE ca.consultant_id = $1 AND ca.is_booked = FALSE
    `;
    const params = [consultantId];
    let paramIndex = 2;

    if (date_from) {
      query += ` AND ca.available_date >= $${paramIndex++}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND ca.available_date <= $${paramIndex++}`;
      params.push(date_to);
    }

    query += ` ORDER BY ca.available_date, ca.start_time`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: '상담 가능 시간을 불러오지 못했습니다.' });
  }
});

// ─── Publish availability slots (consultant only) ────────────────────────────
router.post('/availability', authenticate, authorize('instructor', 'hr_manager', 'admin'), async (req, res) => {
  try {
    const { slots } = req.body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: '등록할 상담 시간을 선택해 주세요.' });
    }

    const results = [];
    for (const slot of slots) {
      const existing = await db.query(
        `SELECT id FROM consultant_availability
         WHERE consultant_id = $1 AND available_date = $2 AND start_time = $3`,
        [req.user.id, slot.date, slot.start_time]
      );

      if (existing.rows.length === 0) {
        const result = await db.query(
          `INSERT INTO consultant_availability AS ca (consultant_id, available_date, start_time, end_time)
           VALUES ($1, $2, $3, $4) RETURNING ${AVAILABILITY_COLUMNS}`,
          [req.user.id, slot.date, slot.start_time, slot.end_time]
        );
        results.push(result.rows[0]);
      }
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Publish availability error:', error);
    res.status(500).json({ error: '상담 시간 등록에 실패했습니다.' });
  }
});

// ─── Get my availability (for consultant) ────────────────────────────────────
router.get('/my-availability', authenticate, authorize('instructor', 'hr_manager', 'admin'), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let query = `
      SELECT ${AVAILABILITY_COLUMNS}, c.user_id, u.name_ko as booked_by_name
      FROM consultant_availability ca
      LEFT JOIN consultations c ON ca.consultation_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ca.consultant_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (date_from) {
      query += ` AND ca.available_date >= $${paramIndex++}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND ca.available_date <= $${paramIndex++}`;
      params.push(date_to);
    }

    query += ` ORDER BY ca.available_date, ca.start_time`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get my availability error:', error);
    res.status(500).json({ error: '상담 가능 시간을 불러오지 못했습니다.' });
  }
});

// ─── Delete availability slot ────────────────────────────────────────────────
router.delete('/availability/:id', authenticate, authorize('instructor', 'hr_manager', 'admin'), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM consultant_availability
       WHERE id = $1 AND consultant_id = $2 AND is_booked = FALSE
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '상담 시간을 찾을 수 없거나 이미 예약되었습니다.' });
    }
    res.json({ message: '상담 시간이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: '상담 시간 삭제에 실패했습니다.' });
  }
});

// ─── Book consultation (user picks available slot) ───────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { user_id, consultant_id, slot_id, scheduled_at, duration_minutes = 30, topic, method } = req.body;

    if (['admin', 'hr_manager'].includes(req.user.role) && user_id && consultant_id && scheduled_at) {
      const result = await db.query(
        `INSERT INTO consultations (user_id, consultant_id, scheduled_at, duration_minutes, topic, method)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, consultant_id, scheduled_at, duration_minutes || 30, topic || '상담', toKorean(method) || '온라인']
      );
      return res.status(201).json(result.rows[0]);
    }

    // Find the slot
    const slotResult = await db.query(
      `SELECT * FROM consultant_availability
       WHERE id = $1 AND consultant_id = $2 AND is_booked = FALSE`,
      [slot_id, consultant_id]
    );

    if (slotResult.rows.length === 0) {
      return res.status(400).json({ error: '선택한 시간은 예약할 수 없습니다.' });
    }

    const slot = slotResult.rows[0];
    const slotDate = slot.available_date instanceof Date
      ? `${slot.available_date.getFullYear()}-${String(slot.available_date.getMonth() + 1).padStart(2, '0')}-${String(slot.available_date.getDate()).padStart(2, '0')}`
      : String(slot.available_date).slice(0, 10);
    const slotScheduledAt = `${slotDate}T${slot.start_time}+09:00`;

    const result = await db.query(
      `INSERT INTO consultations (user_id, consultant_id, scheduled_at, duration_minutes, topic, method)
       VALUES ($1, $2, $3, 30, $4, $5)
       RETURNING *`,
      [req.user.id, consultant_id, slotScheduledAt, topic, toKorean(method) || '온라인']
    );

    // Mark slot as booked
    await db.query(
      `UPDATE consultant_availability SET is_booked = TRUE, consultation_id = $1 WHERE id = $2`,
      [result.rows[0].id, slot_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Book consultation error:', error);
    res.status(500).json({ error: '상담 예약에 실패했습니다.' });
  }
});

// ─── Get consultation detail with records ────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await db.query(
      `SELECT c.*,
              u.name_ko as user_name, u.email as user_email, u.phone as user_phone,
              cu.name_ko as consultant_name, cu.department as consultant_department
       FROM consultations c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN users cu ON c.consultant_id = cu.id
       WHERE c.id = $1`,
      [id]
    );

    if (consultation.rows.length === 0) {
      return res.status(404).json({ error: '상담을 찾을 수 없습니다.' });
    }

    const c = consultation.rows[0];
    const isParticipant = c.user_id === req.user.id || c.consultant_id === req.user.id;
    const isAdmin = ['admin', 'hr_manager'].includes(req.user.role);
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const records = await db.query(
      `SELECT cr.*, u.name_ko as author_name
       FROM consultation_records cr
       LEFT JOIN users u ON cr.author_id = u.id
       WHERE cr.consultation_id = $1
       ORDER BY cr.created_at ASC`,
      [id]
    );

    res.json({ ...c, records: records.rows });
  } catch (error) {
    console.error('Get consultation detail error:', error);
    res.status(500).json({ error: '상담 정보를 불러오지 못했습니다.' });
  }
});

// ─── Update consultation ─────────────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const status = toKorean(req.body.status);
    const method = toKorean(req.body.method);
    const { summary, notes } = req.body;

    const check = await db.query('SELECT * FROM consultations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: '상담을 찾을 수 없습니다.' });
    }

    const consultation = check.rows[0];
    const isOwner = consultation.user_id === req.user.id;
    const isConsultant = consultation.consultant_id === req.user.id;
    const isAdmin = ['admin', 'hr_manager'].includes(req.user.role);

    if (!isOwner && !isConsultant && !isAdmin) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const result = await db.query(
      `UPDATE consultations
       SET status = COALESCE($1, status),
           summary = COALESCE($2, summary),
           notes = COALESCE($3, notes),
           method = COALESCE($4, method),
           completed_at = CASE WHEN $1 = '완료' THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = $5
       RETURNING *`,
      [status, summary, notes, method, id]
    );

    // If cancelled, free up the availability slot
    if (status === '취소') {
      await db.query(
        `UPDATE consultant_availability SET is_booked = FALSE, consultation_id = NULL WHERE consultation_id = $1`,
        [id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: '상담 수정에 실패했습니다.' });
  }
});

// ─── Cancel consultation ─────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = ['admin', 'hr_manager'].includes(req.user.role);

    // Owners may cancel only scheduled consultations; admins/HR and the
    // assigned consultant may cancel any consultation.
    const result = await db.query(
      `UPDATE consultations SET status = '취소', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND ($3::boolean OR consultant_id = $2 OR (user_id = $2 AND status = '예약됨'))
       RETURNING *`,
      [id, req.user.id, isAdmin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '상담을 찾을 수 없거나 취소할 수 없습니다.' });
    }

    // Free up slot
    await db.query(
      `UPDATE consultant_availability SET is_booked = FALSE, consultation_id = NULL WHERE consultation_id = $1`,
      [id]
    );

    res.json({ message: '상담이 취소되었습니다.', consultation: result.rows[0] });
  } catch (error) {
    console.error('Cancel consultation error:', error);
    res.status(500).json({ error: '상담 취소에 실패했습니다.' });
  }
});

// ─── Add consultation record ─────────────────────────────────────────────────
router.post('/:id/records', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { record_type, content, file_url, file_name } = req.body;

    const check = await db.query('SELECT * FROM consultations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: '상담을 찾을 수 없습니다.' });
    }

    const c = check.rows[0];
    const isParticipant = c.user_id === req.user.id || c.consultant_id === req.user.id;
    const isAdmin = ['admin', 'hr_manager'].includes(req.user.role);
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const result = await db.query(
      `INSERT INTO consultation_records (consultation_id, author_id, record_type, content, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, req.user.id, record_type || 'text', content, file_url, file_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add record error:', error);
    res.status(500).json({ error: '상담 기록 등록에 실패했습니다.' });
  }
});

module.exports = router;
