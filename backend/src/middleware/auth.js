const passport = require('passport');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');
const { normalizeRole } = require('../utils/roles');

// Authenticate with a JWT issued by /api/auth/login or /api/auth/register.
const authenticate = (req, res, next) => (
  passport.authenticate('jwt', { session: false })(req, res, next)
);

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user.role = normalizeRole(req.user.role);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

module.exports = {
  authenticate,
  authorize,
  generateToken,
  optionalAuth
};
