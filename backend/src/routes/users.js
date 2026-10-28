const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeRole, canManageRole, ROLES } = require('../utils/roles');

// Get all users (admin only)
router.get('/', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 20;
    const offset = (numericPage - 1) * numericLimit;

    let where = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) {
      where += ` AND role = $${paramIndex++}`;
      params.push(role);
    }

    if (status) {
      where += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      where += ` AND (name_ko ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM users ${where}`, params);

    const result = await db.query(
      `
      SELECT id, email, employee_id, name_ko, name_en, role, status,
             department, position, retirement_date, created_at, last_login_at, last_login_ip
      FROM users
      ${where}
      ORDER BY created_at DESC NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      [...params, numericLimit, offset]
    );

    res.json({
      users: result.rows,
      pagination: {
        total: countResult.rows[0].count,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(countResult.rows[0].count / numericLimit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '사용자 목록을 불러오지 못했습니다.', detail: error.message });
  }
});

// Create user, sub-admin, lecturer, or admin account.
router.post('/', authenticate, authorize('admin', 'hr_manager'), [
  body('email').isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('name_ko').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
    const {
      email,
      password,
      name_ko,
      name_en,
      employee_id,
      phone,
      role = ROLES.USER,
      status = 'active',
      department,
      position,
      retirement_date,
    } = req.body;

    const targetRole = normalizeRole(clean(role) || ROLES.USER);
    if (!canManageRole(req.user.role, targetRole)) {
      return res.status(403).json({ error: '해당 역할의 계정을 생성할 권한이 없습니다.' });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }

    const initialPassword = password || Math.random().toString(36).slice(2, 12) + 'A1!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    const result = await db.query(
      `INSERT INTO users (
        email, password_hash, name_ko, name_en, employee_id, phone, role, status,
        department, position, retirement_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, email, employee_id, name_ko, name_en, role, status,
                phone, department, position, retirement_date, created_at`,
      [
        email, passwordHash, clean(name_ko), clean(name_en), clean(employee_id), clean(phone), targetRole, clean(status) || 'active',
        clean(department), clean(position), clean(retirement_date),
      ]
    );

    res.status(201).json({
      message: '사용자가 생성되었습니다.',
      user: result.rows[0],
      temporaryPassword: password ? undefined : initialPassword,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: '사용자 생성에 실패했습니다.', detail: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (req.user.id !== id && !['admin', 'hr_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const result = await db.query(
      `SELECT id, email, employee_id, name_ko, name_en, role, status, phone,
              department, position, retirement_date, profile_image, preferred_language,
              created_at, last_login_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '사용자 정보를 불러오지 못했습니다.' });
  }
});

// Update user (admin only)
router.put('/:id', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
    const { role, status, department, position, name_ko, name_en, phone } = req.body;
    const email = typeof req.body.email === 'string' ? clean(req.body.email.trim().toLowerCase()) : null;
    const targetRole = role ? normalizeRole(role) : undefined;

    const existing = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!canManageRole(req.user.role, targetRole || existing.rows[0].role)) {
      return res.status(403).json({ error: '해당 역할을 관리할 권한이 없습니다.' });
    }

    const result = await db.query(
      `UPDATE users
       SET role = COALESCE($1, role),
           status = COALESCE($2, status),
           department = COALESCE($3, department),
           position = COALESCE($4, position),
           name_ko = COALESCE($6, name_ko),
           name_en = COALESCE($7, name_en),
           email = COALESCE($8, email),
           phone = COALESCE($9, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, name_ko, name_en, phone, role, status, department, position`,
      [targetRole, clean(status), clean(department), clean(position), id,
        clean(name_ko), clean(name_en), email, clean(phone)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      message: '사용자 정보가 수정되었습니다.',
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: '사용자 정보 수정에 실패했습니다.' });
  }
});

router.put('/:id/status', authenticate, authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'inactive' } = req.body;

    const existing = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!canManageRole(req.user.role, existing.rows[0].role)) {
      return res.status(403).json({ error: '해당 역할을 관리할 권한이 없습니다.' });
    }

    const result = await db.query(
      `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name_ko, name_en, role, status`,
      [status, id]
    );

    res.json({ message: '사용자 상태가 변경되었습니다.', user: result.rows[0] });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: '사용자 상태 변경에 실패했습니다.', detail: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: '본인 계정은 비활성화할 수 없습니다.' });
    }

    const existing = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!canManageRole(req.user.role, existing.rows[0].role)) {
      return res.status(403).json({ error: '해당 역할을 관리할 권한이 없습니다.' });
    }

    await db.query(
      `UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ message: '사용자가 비활성화되었습니다.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '사용자 비활성화에 실패했습니다.', detail: error.message });
  }
});

// Get user skills
router.get('/:id/skills', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT us.id, us.proficiency_level, us.verified, us.verified_at,
              s.id as skill_id, s.name_ko, s.name_en, s.category
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY us.proficiency_level DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    // skills/user_skills tables are not part of the core schema.
    if (error.code === '42P01') return res.json([]);
    console.error('Get user skills error:', error);
    res.status(500).json({ error: '역량 정보를 불러오지 못했습니다.' });
  }
});

// Add/Update user skill
router.post('/:id/skills', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { skill_id, proficiency_level } = req.body;

    // Users can only update their own skills
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const result = await db.query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency_level)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, skill_id)
       DO UPDATE SET proficiency_level = $3
       RETURNING *`,
      [id, skill_id, proficiency_level]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '42P01') {
      return res.status(404).json({ error: '역량 기능을 사용할 수 없습니다.' });
    }
    console.error('Update user skill error:', error);
    res.status(500).json({ error: '역량 수정에 실패했습니다.' });
  }
});

module.exports = router;
