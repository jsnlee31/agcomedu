const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { generateToken, authenticate } = require('../middleware/auth');
const { normalizeRole } = require('../utils/roles');

// Create the first admin only when the database has no admin yet.
router.post('/bootstrap-admin', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name_ko').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existingAdmin = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.rows.length > 0) {
      return res.status(403).json({ error: '관리자 계정이 이미 존재합니다.' });
    }

    const { email, password, name_ko, name_en } = req.body;
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name_ko, name_en, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')
       RETURNING id, email, name_ko, name_en, role, status`,
      [email, passwordHash, name_ko, name_en]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ message: '관리자 계정이 생성되었습니다.', user, token });
  } catch (error) {
    console.error('Bootstrap admin error:', error);
    res.status(500).json({ error: '관리자 계정 생성에 실패했습니다.' });
  }
});

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name_ko').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name_ko, name_en, employee_id, phone } = req.body;
    const optionalText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name_ko, name_en, employee_id, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name_ko, name_en, role, status`,
      [email, passwordHash, name_ko.trim(), optionalText(name_en), optionalText(employee_id), optionalText(phone), normalizeRole('user')]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: error.constraint?.includes('employee') ? '이미 등록된 사번입니다.' : '이미 등록된 이메일입니다.' });
    }
    res.status(500).json({ error: '회원가입에 실패했습니다.' });
  }
});

// Login with email/password
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = result.rows[0];

    // Check if user has password (might be OAuth only)
    if (!user.password_hash) {
      return res.status(401).json({ error: '소셜 로그인으로 로그인해 주세요.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(401).json({ error: '비활성화된 계정입니다.' });
    }

    // Update last login
    const loginIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null;
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $2 WHERE id = $1',
      [user.id, loginIp]
    );

    const token = generateToken(user);

    res.json({
      message: '로그인되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        name_ko: user.name_ko,
        name_en: user.name_en,
        role: user.role,
        profile_image: user.profile_image,
        preferred_language: user.preferred_language
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인에 실패했습니다.' });
  }
});

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, employee_id, name_ko, name_en, role, status, phone,
              department, position, retirement_date, profile_image, preferred_language,
              created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: '사용자 정보를 불러오지 못했습니다.' });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('name_ko').optional().trim(),
  body('name_en').optional().trim(),
  body('phone').optional().trim(),
  body('preferred_language').optional().isIn(['ko', 'en']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const clean = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);
    const { name_ko, name_en, phone, preferred_language } = req.body;

    const result = await db.query(
      `UPDATE users
       SET name_ko = COALESCE($1, name_ko),
           name_en = COALESCE($2, name_en),
           phone = COALESCE($3, phone),
           preferred_language = COALESCE($4, preferred_language),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, name_ko, name_en, role, phone, preferred_language`,
      [clean(name_ko), clean(name_en), clean(phone), clean(preferred_language), req.user.id]
    );

    res.json({
      message: '프로필이 수정되었습니다.',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '프로필 수정에 실패했습니다.' });
  }
});

// Change password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0].password_hash) {
      return res.status(400).json({ error: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, req.user.id]
    );

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' });
  }
});

// Logout (for token blacklisting if needed)
router.post('/logout', authenticate, (req, res) => {
  // In a production app, you might want to blacklist the token
  res.json({ message: '로그아웃되었습니다.' });
});

module.exports = router;
