const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const programRoutes = require('./routes/programs');
const consultationRoutes = require('./routes/consultations');
const courseRoutes = require('./routes/courses');
const jobRoutes = require('./routes/jobs');
const announcementRoutes = require('./routes/announcements');
const qaRoutes = require('./routes/qa');
const faqRoutes = require('./routes/faq');
const inquiryRoutes = require('./routes/inquiries');
const dashboardRoutes = require('./routes/dashboard');
const resumeRoutes = require('./routes/resumes');
const siteSettingsRoutes = require('./routes/siteSettings');
const uploadRoutes = require('./routes/uploads');
const db = require('./config/database');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  // The site and API share one origin on Vercel; FRONTEND_URL only matters
  // when the frontend is hosted elsewhere.
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
app.use(passport.initialize());
require('./config/passport')(passport);

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: db.isConfigured ? 'configured' : 'missing',
    storage: Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
      && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)),
  };
  try {
    await db.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.databaseError = error.message;
  }
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// Make sure tables and seed data exist before the first real request on each
// cold start. After the first successful run this is a single cheap query.
app.use('/api', async (req, res, next) => {
  try {
    await db.ensureSchemaOnce();
    next();
  } catch (error) {
    console.error('Schema check failed:', error);
    res.status(503).json({ error: '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/uploads', uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
