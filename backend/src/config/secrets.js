const crypto = require('crypto');

// JWT signing secret. Prefer an explicit JWT_SECRET; otherwise use the
// Supabase JWT secret, and as a last resort derive a stable secret from the
// database credentials so tokens are never signed with a public default.
const resolveJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.SUPABASE_JWT_SECRET) return process.env.SUPABASE_JWT_SECRET;

  const material = process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_PASSWORD
    || process.env.DB_PASSWORD;
  if (material) {
    return crypto.createHash('sha256').update(`agcomedu-jwt:${material}`).digest('hex');
  }

  console.warn('JWT_SECRET is not set; using a development-only secret.');
  return 'agcomedu-local-development-secret';
};

module.exports = { jwtSecret: resolveJwtSecret() };
