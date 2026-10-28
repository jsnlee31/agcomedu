const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const CLOSED_PROGRAM_STATUSES = ['closed', 'completed', 'cancelled'];
const CANCELLED_APPLICATION_SQL = "('cancelled', '취소')";
const blankToNull = (value) => (value === '' ? null : value);

const APPLICATION_NOTE_FIELDS = [
  ['motivation', '지원 동기'],
  ['experience', '관련 경험'],
  ['expectations', '기대 사항'],
  ['notes', '기타 메모'],
];
const buildApplicationNotes = (body = {}) => APPLICATION_NOTE_FIELDS
  .map(([field, label]) => {
    const value = typeof body[field] === 'string' ? body[field].trim() : body[field];
    return value ? `[${label}]\n${value}` : null;
  })
  .filter(Boolean)
  .join('\n\n');

const countApplications = async (programId) => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS application_count
     FROM program_applications
     WHERE program_id = $1 AND COALESCE(status::text, 'pending') NOT IN ${CANCELLED_APPLICATION_SQL}`,
    [programId]
  );
  return result.rows[0]?.application_count || 0;
};

const withParticipantCount = `
  COALESCE((
    SELECT COUNT(*)::int
    FROM program_applications pa
    WHERE pa.program_id = p.id
      AND COALESCE(pa.status::text, 'pending') NOT IN ${CANCELLED_APPLICATION_SQL}
  ), 0) AS current_participants
`;

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const numericLimit = Number(limit);
    const numericPage = Number(page);
    const offset = (numericPage - 1) * numericLimit;
    const params = [];
    let where = 'WHERE 1=1';

    if (status) {
      params.push(status);
      where += ` AND p.status::text = $${params.length}`;
    }

    if (category) {
      params.push(category);
      where += ` AND p.category::text = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (p.title_ko ILIKE $${params.length} OR p.title_en ILIKE $${params.length})`;
    }

    const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM programs p ${where}`, params);
    const result = await db.query(
      `SELECT p.*, u.name_ko as instructor_name, ${withParticipantCount}
       FROM programs p
       LEFT JOIN users u ON p.instructor_id = u.id
       ${where}
       ORDER BY p.recruitment_start DESC NULLS LAST, p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, numericLimit, offset]
    );

    const total = countResult.rows[0]?.count || 0;
    res.json({
      programs: result.rows,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.json({
      programs: [],
      pagination: { total: 0, page: Number(req.query.page || 1), limit: Number(req.query.limit || 10), pages: 0 }
    });
  }
});

router.get('/my/applications', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pa.*, p.title_ko, p.title_en, p.status AS program_status, p.category,
              p.program_start AS start_date, p.program_end AS end_date
       FROM program_applications pa
       JOIN programs p ON pa.program_id = p.id
       WHERE pa.user_id = $1
       ORDER BY pa.applied_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get my program applications error:', error);
    res.status(500).json({ error: '지원 내역을 불러오지 못했습니다.' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.*, u.name_ko as instructor_name, u.email as instructor_email, ${withParticipantCount}
       FROM programs p
       LEFT JOIN users u ON p.instructor_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '프로그램을 찾을 수 없습니다.' });
    }

    let userApplication = null;
    if (req.user) {
      const appResult = await db.query(
        'SELECT * FROM program_applications WHERE user_id = $1 AND program_id = $2',
        [req.user.id, id]
      );
      userApplication = appResult.rows[0] || null;
    }

    res.json({ ...result.rows[0], userApplication });
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: '프로그램을 불러오지 못했습니다.' });
  }
});

router.post('/', authenticate, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const {
      title_ko, title_en, description_ko, description_en, category,
      recruitment_start, recruitment_end, program_start, program_end,
      max_participants, location, requirements
    } = req.body;

    if (!blankToNull(title_ko)) {
      return res.status(400).json({ error: '프로그램명(국문)은 필수입니다.' });
    }

    const result = await db.query(
      `INSERT INTO programs (
        title_ko, title_en, description_ko, description_en, category,
        recruitment_start, recruitment_end, program_start, program_end,
        max_participants, location, instructor_id, requirements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title_ko, blankToNull(title_en), blankToNull(description_ko), blankToNull(description_en), blankToNull(category),
        blankToNull(recruitment_start), blankToNull(recruitment_end), blankToNull(program_start), blankToNull(program_end),
        blankToNull(max_participants), blankToNull(location), req.user.id, blankToNull(requirements)
      ]
    );

    res.status(201).json({ ...result.rows[0], current_participants: 0 });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: '프로그램 생성에 실패했습니다.', detail: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title_ko, title_en, description_ko, description_en, category, status,
      recruitment_start, recruitment_end, program_start, program_end,
      max_participants, location, requirements
    } = req.body;

    const result = await db.query(
      `UPDATE programs SET
        title_ko = COALESCE($1, title_ko),
        title_en = COALESCE($2, title_en),
        description_ko = COALESCE($3, description_ko),
        description_en = COALESCE($4, description_en),
        category = COALESCE($5, category),
        status = COALESCE($6, status),
        recruitment_start = COALESCE($7, recruitment_start),
        recruitment_end = COALESCE($8, recruitment_end),
        program_start = COALESCE($9, program_start),
        program_end = COALESCE($10, program_end),
        max_participants = COALESCE($11, max_participants),
        location = COALESCE($12, location),
        requirements = COALESCE($13, requirements),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        blankToNull(title_ko), blankToNull(title_en), blankToNull(description_ko), blankToNull(description_en), blankToNull(category), blankToNull(status),
        blankToNull(recruitment_start), blankToNull(recruitment_end), blankToNull(program_start), blankToNull(program_end),
        blankToNull(max_participants), blankToNull(location), blankToNull(requirements), id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '프로그램을 찾을 수 없습니다.' });
    }

    const applicationCount = await countApplications(id);
    res.json({ ...result.rows[0], current_participants: applicationCount });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: '프로그램 수정에 실패했습니다.', detail: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM programs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '프로그램을 찾을 수 없습니다.' });
    }
    res.json({ message: '프로그램이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: '프로그램 삭제에 실패했습니다.' });
  }
});

router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const notes = buildApplicationNotes(req.body);

    const program = await db.query('SELECT * FROM programs WHERE id = $1', [id]);
    if (program.rows.length === 0) {
      return res.status(404).json({ error: '프로그램을 찾을 수 없습니다.' });
    }

    const normalizedStatus = String(program.rows[0].status || '').toLowerCase();
    if (CLOSED_PROGRAM_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: '현재 신청을 받지 않는 프로그램입니다.' });
    }

    const applicationCount = await countApplications(id);
    const maxParticipants = Number(program.rows[0].max_participants || 0);
    if (maxParticipants > 0 && applicationCount >= maxParticipants) {
      return res.status(400).json({ error: '모집 인원이 마감되었습니다.' });
    }

    const result = await db.query(
      `INSERT INTO program_applications (user_id, program_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, program_id)
       DO UPDATE SET notes = EXCLUDED.notes, applied_at = CURRENT_TIMESTAMP,
         status = CASE WHEN program_applications.status IN ${CANCELLED_APPLICATION_SQL} THEN 'pending' ELSE program_applications.status END
       RETURNING *`,
      [req.user.id, id, notes]
    );

    res.status(201).json({
      message: '신청이 완료되었습니다.',
      application: result.rows[0],
      current_participants: await countApplications(id)
    });
  } catch (error) {
    console.error('Apply to program error:', error);
    res.status(500).json({ error: '신청에 실패했습니다.' });
  }
});

router.delete('/:id/apply', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM program_applications WHERE user_id = $1 AND program_id = $2 RETURNING *',
      [req.user.id, req.params.id]
    );

    res.json({
      removed: result.rows.length > 0,
      current_participants: await countApplications(req.params.id)
    });
  } catch (error) {
    console.error('Cancel program application error:', error);
    res.status(500).json({ error: '신청 취소에 실패했습니다.' });
  }
});

router.get('/:id/applications', authenticate, authorize('admin', 'instructor', 'hr_manager'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pa.*, u.name_ko, u.name_en, u.email, u.phone
       FROM program_applications pa
       JOIN users u ON pa.user_id = u.id
       WHERE pa.program_id = $1
       ORDER BY pa.applied_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: '신청 목록을 불러오지 못했습니다.' });
  }
});

router.put('/:id/applications/:appId', authenticate, authorize('admin', 'instructor', 'hr_manager'), async (req, res) => {
  try {
    const { id, appId } = req.params;
    const { status } = req.body;

    const result = await db.query(
      `UPDATE program_applications
       SET status = $1::text,
           approved_at = CASE WHEN LOWER($1::text) IN ('approved', 'approval_complete') THEN CURRENT_TIMESTAMP ELSE approved_at END,
           approved_by = CASE WHEN LOWER($1::text) IN ('approved', 'approval_complete') THEN $2::uuid ELSE approved_by END
       WHERE id = $3 AND program_id = $4
       RETURNING *`,
      [status, req.user.id, appId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '신청 내역을 찾을 수 없습니다.' });
    }

    res.json({ ...result.rows[0], current_participants: await countApplications(id) });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: '신청 상태 변경에 실패했습니다.' });
  }
});

module.exports = router;
