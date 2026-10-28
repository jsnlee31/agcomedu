const { Pool, types } = require('pg');

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates, which
// would otherwise be shifted by the server timezone when serialized.
types.setTypeParser(1082, (value) => value);
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

const isLocalConnection = (value) => /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(value || '')
  || process.env.PGSSLMODE === 'disable';

const normalizeSslConnectionString = (value) => {
  if (!value || isLocalConnection(value)) return value;
  try {
    const url = new URL(value);
    url.searchParams.set('sslmode', 'no-verify');
    return url.toString();
  } catch {
    const separator = value.includes('?') ? '&' : '?';
    return `${value}${separator}sslmode=no-verify`;
  }
};

const pool = new Pool(connectionString ? {
  connectionString: normalizeSslConnectionString(connectionString),
  ssl: isLocalConnection(connectionString) ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
} : {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'asiangames_platform',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Never exit on idle-client errors: in a serverless function that would take
// down every in-flight request. The pool discards the broken client itself.
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

let schemaReady;
let schemaChecked;

// Bump when ensureCoreSchema changes so deployed databases re-run it once.
const SCHEMA_VERSION = '2026-10-29.1';

const run = (text, params) => pool.query(text, params);

const dropNotNull = async (table, columns) => {
  for (const column of columns) {
    try {
      await run(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL`);
    } catch (error) {
      console.error(`Drop NOT NULL skipped for ${table}.${column}:`, error.message);
    }
  }
};

const ensureCoreSchema = async () => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await run('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Databases created from the original schema.sql use Postgres enums with
      // a fixed set of values. The app stores free-form categories/statuses,
      // so convert every enum column to plain text.
      const { rows: enumColumns } = await run(`
        SELECT c.table_name, c.column_name, c.column_default
        FROM information_schema.columns c
        JOIN pg_type t ON t.typname = c.udt_name
        WHERE c.table_schema = 'public' AND c.data_type = 'USER-DEFINED' AND t.typtype = 'e'
      `);
      for (const column of enumColumns) {
        try {
          await run(`ALTER TABLE ${column.table_name} ALTER COLUMN ${column.column_name} DROP DEFAULT`);
          await run(`ALTER TABLE ${column.table_name} ALTER COLUMN ${column.column_name} TYPE VARCHAR(100) USING ${column.column_name}::text`);
          const literal = (column.column_default || '').match(/^'(.*)'::/);
          if (literal) {
            await run(`ALTER TABLE ${column.table_name} ALTER COLUMN ${column.column_name} SET DEFAULT '${literal[1].replace(/'/g, "''")}'`);
          }
        } catch (error) {
          console.error(`Enum conversion skipped for ${column.table_name}.${column.column_name}:`, error.message);
        }
      }

      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          employee_id VARCHAR(20) UNIQUE,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name_ko VARCHAR(100),
          name_en VARCHAR(100),
          role VARCHAR(50) DEFAULT 'learner',
          status VARCHAR(50) DEFAULT 'active',
          phone VARCHAR(20),
          department VARCHAR(100),
          position VARCHAR(100),
          retirement_date DATE,
          profile_image VARCHAR(500),
          oauth_provider VARCHAR(50),
          oauth_id VARCHAR(255),
          preferred_language VARCHAR(10) DEFAULT 'ko',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP WITH TIME ZONE,
          last_login_ip VARCHAR(100)
        )
      `);

      const userColumns = [
        ['employee_id', 'VARCHAR(20)'],
        ['password_hash', 'VARCHAR(255)'],
        ['name_ko', 'VARCHAR(100)'],
        ['name_en', 'VARCHAR(100)'],
        ['role', "VARCHAR(50) DEFAULT 'learner'"],
        ['status', "VARCHAR(50) DEFAULT 'active'"],
        ['phone', 'VARCHAR(20)'],
        ['department', 'VARCHAR(100)'],
        ['position', 'VARCHAR(100)'],
        ['retirement_date', 'DATE'],
        ['profile_image', 'VARCHAR(500)'],
        ['oauth_provider', 'VARCHAR(50)'],
        ['oauth_id', 'VARCHAR(255)'],
        ['preferred_language', "VARCHAR(10) DEFAULT 'ko'"],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['last_login_at', 'TIMESTAMP WITH TIME ZONE'],
        ['last_login_ip', 'VARCHAR(100)'],
      ];
      for (const [column, definition] of userColumns) {
        await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('users', ['employee_id', 'password_hash', 'name_en', 'phone', 'department', 'position', 'retirement_date', 'profile_image', 'oauth_provider', 'oauth_id', 'preferred_language', 'last_login_at', 'last_login_ip']);

      await run(`
        INSERT INTO users (id, email, name_ko, name_en, role, status, department)
        VALUES
          ('00000000-0000-0000-0000-000000000001', 'admin@asiangames.com', '선수단 관리자', 'Asian Games Admin', 'admin', 'active', '선수단 운영팀'),
          ('00000000-0000-0000-0000-000000000002', 'coach@asiangames.com', '국가대표 코치', 'National Team Coach', 'instructor', 'active', '기술 코칭팀'),
          ('00000000-0000-0000-0000-000000000003', 'athlete@asiangames.com', '국가대표 선수', 'National Team Athlete', 'learner', 'active', '선수단')
        ON CONFLICT DO NOTHING
      `);

      // Earlier versions seeded English display names; switch only those.
      await run(`
        UPDATE users SET name_ko = CASE name_ko
          WHEN 'Asian Games Admin' THEN '선수단 관리자'
          WHEN 'National Team Coach' THEN '국가대표 코치'
          WHEN 'National Team Athlete' THEN '국가대표 선수'
        END
        WHERE name_ko IN ('Asian Games Admin', 'National Team Coach', 'National Team Athlete')
      `);
      await run(`
        UPDATE users SET department = CASE department
          WHEN 'Delegation Operations' THEN '선수단 운영팀'
          WHEN 'Technical Coaching' THEN '기술 코칭팀'
          WHEN 'Athlete Delegation' THEN '선수단'
        END
        WHERE department IN ('Delegation Operations', 'Technical Coaching', 'Athlete Delegation')
      `);

      // Seeded accounts get the initial password demo1234 once; after an
      // admin changes it, it is never touched again.
      await run(
        `UPDATE users SET password_hash = $1
         WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')
           AND password_hash IS NULL`,
        [bcrypt.hashSync('demo1234', 10)]
      );

      await run(`
        CREATE TABLE IF NOT EXISTS courses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title_ko VARCHAR(200) NOT NULL,
          title_en VARCHAR(200),
          description_ko TEXT,
          description_en TEXT,
          category VARCHAR(100),
          type VARCHAR(50) DEFAULT 'video',
          duration_minutes INTEGER,
          thumbnail_url VARCHAR(500),
          video_url VARCHAR(500),
          document_url VARCHAR(500),
          file_size VARCHAR(20),
          view_count INTEGER DEFAULT 0,
          download_count INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT FALSE,
          instructor_id UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const courseColumns = [
        ['title_ko', 'VARCHAR(200)'],
        ['title_en', 'VARCHAR(200)'],
        ['description_ko', 'TEXT'],
        ['description_en', 'TEXT'],
        ['category', 'VARCHAR(100)'],
        ['type', "VARCHAR(50) DEFAULT 'video'"],
        ['duration_minutes', 'INTEGER'],
        ['thumbnail_url', 'VARCHAR(500)'],
        ['video_url', 'VARCHAR(500)'],
        ['document_url', 'VARCHAR(500)'],
        ['file_size', 'VARCHAR(20)'],
        ['view_count', 'INTEGER DEFAULT 0'],
        ['download_count', 'INTEGER DEFAULT 0'],
        ['is_featured', 'BOOLEAN DEFAULT FALSE'],
        ['instructor_id', 'UUID REFERENCES users(id)'],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
      ];
      for (const [column, definition] of courseColumns) {
        await run(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('courses', ['title_en', 'description_ko', 'description_en', 'category', 'type', 'duration_minutes', 'thumbnail_url', 'video_url', 'document_url', 'file_size', 'view_count', 'download_count', 'is_featured', 'instructor_id', 'created_at', 'updated_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
          progress_percent INTEGER DEFAULT 0,
          is_completed BOOLEAN DEFAULT FALSE,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          last_accessed_at TIMESTAMP WITH TIME ZONE,
          UNIQUE(user_id, course_id)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS programs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title_ko VARCHAR(200) NOT NULL,
          title_en VARCHAR(200),
          description_ko TEXT,
          description_en TEXT,
          category VARCHAR(100),
          status VARCHAR(50) DEFAULT 'open',
          recruitment_start DATE,
          recruitment_end DATE,
          program_start DATE,
          program_end DATE,
          max_participants INTEGER DEFAULT 30,
          current_participants INTEGER DEFAULT 0,
          location VARCHAR(200),
          instructor_id UUID REFERENCES users(id),
          requirements TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const programColumns = [
        ['title_ko', 'VARCHAR(200)'],
        ['title_en', 'VARCHAR(200)'],
        ['description_ko', 'TEXT'],
        ['description_en', 'TEXT'],
        ['category', 'VARCHAR(100)'],
        ['status', "VARCHAR(50) DEFAULT 'open'"],
        ['recruitment_start', 'DATE'],
        ['recruitment_end', 'DATE'],
        ['program_start', 'DATE'],
        ['program_end', 'DATE'],
        ['max_participants', 'INTEGER DEFAULT 30'],
        ['current_participants', 'INTEGER DEFAULT 0'],
        ['location', 'VARCHAR(200)'],
        ['instructor_id', 'UUID REFERENCES users(id)'],
        ['requirements', 'TEXT'],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
      ];
      for (const [column, definition] of programColumns) {
        await run(`ALTER TABLE programs ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('programs', ['title_en', 'description_ko', 'description_en', 'category', 'status', 'recruitment_start', 'recruitment_end', 'program_start', 'program_end', 'max_participants', 'current_participants', 'location', 'instructor_id', 'requirements', 'created_at', 'updated_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS program_applications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'pending',
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          approved_at TIMESTAMP WITH TIME ZONE,
          approved_by UUID REFERENCES users(id),
          notes TEXT,
          UNIQUE(user_id, program_id)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS resumes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(200),
          content JSONB,
          file_url VARCHAR(500),
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS title VARCHAR(200)');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS content JSONB');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
      await run('ALTER TABLE resumes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
      await dropNotNull('resumes', ['title', 'content', 'file_url', 'is_primary', 'created_at', 'updated_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS jobs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_name VARCHAR(200) NOT NULL,
          title_ko VARCHAR(200) NOT NULL,
          title_en VARCHAR(200),
          description_ko TEXT,
          description_en TEXT,
          category VARCHAR(100),
          employment_type VARCHAR(100),
          location VARCHAR(200),
          salary_range VARCHAR(100),
          requirements TEXT,
          benefits TEXT,
          contact_info VARCHAR(200),
          external_url VARCHAR(500),
          posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deadline DATE,
          is_active BOOLEAN DEFAULT TRUE,
          view_count INTEGER DEFAULT 0
        )
      `);
      const jobColumns = [
        ['company_name', 'VARCHAR(200)'],
        ['title_ko', 'VARCHAR(200)'],
        ['title_en', 'VARCHAR(200)'],
        ['description_ko', 'TEXT'],
        ['description_en', 'TEXT'],
        ['category', 'VARCHAR(100)'],
        ['employment_type', 'VARCHAR(100)'],
        ['location', 'VARCHAR(200)'],
        ['salary_range', 'VARCHAR(100)'],
        ['requirements', 'TEXT'],
        ['benefits', 'TEXT'],
        ['contact_info', 'VARCHAR(200)'],
        ['external_url', 'VARCHAR(500)'],
        ['posted_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['deadline', 'DATE'],
        ['is_active', 'BOOLEAN DEFAULT TRUE'],
        ['view_count', 'INTEGER DEFAULT 0'],
      ];
      for (const [column, definition] of jobColumns) {
        await run(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('jobs', ['title_en', 'description_ko', 'description_en', 'category', 'employment_type', 'location', 'salary_range', 'requirements', 'benefits', 'contact_info', 'external_url', 'posted_at', 'deadline', 'is_active', 'view_count']);

      await run(`
        CREATE TABLE IF NOT EXISTS job_bookmarks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, job_id)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS job_applications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
          resume_id UUID,
          cover_letter TEXT,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'submitted'
        )
      `);
      await run('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_id UUID');
      await run('ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter TEXT');
      await run("ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted'");

      await run(`
        CREATE TABLE IF NOT EXISTS announcements (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title_ko VARCHAR(200) NOT NULL,
          title_en VARCHAR(200),
          content_ko TEXT,
          content_en TEXT,
          type VARCHAR(50),
          display_type VARCHAR(50) DEFAULT 'list',
          is_pinned BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          start_date TIMESTAMP WITH TIME ZONE,
          end_date TIMESTAMP WITH TIME ZONE,
          target_roles TEXT[],
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const announcementColumns = [
        ['title_ko', 'VARCHAR(200)'],
        ['title_en', 'VARCHAR(200)'],
        ['content_ko', 'TEXT'],
        ['content_en', 'TEXT'],
        ['type', 'VARCHAR(50)'],
        ['display_type', "VARCHAR(50) DEFAULT 'list'"],
        ['is_pinned', 'BOOLEAN DEFAULT FALSE'],
        ['is_active', 'BOOLEAN DEFAULT TRUE'],
        ['start_date', 'TIMESTAMP WITH TIME ZONE'],
        ['end_date', 'TIMESTAMP WITH TIME ZONE'],
        ['target_roles', 'TEXT[]'],
        ['created_by', 'UUID REFERENCES users(id)'],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
      ];
      for (const [column, definition] of announcementColumns) {
        await run(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('announcements', ['title_en', 'content_ko', 'content_en', 'type', 'display_type', 'is_pinned', 'is_active', 'start_date', 'end_date', 'target_roles', 'created_by', 'created_at', 'updated_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS announcement_reads (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
          read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          dismissed BOOLEAN DEFAULT FALSE,
          UNIQUE(user_id, announcement_id)
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS faq_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name_ko VARCHAR(100) NOT NULL,
          name_en VARCHAR(100),
          sort_order INTEGER DEFAULT 0
        )
      `);
      await run('ALTER TABLE faq_categories ADD COLUMN IF NOT EXISTS name_ko VARCHAR(100)');
      await run('ALTER TABLE faq_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(100)');
      await run('ALTER TABLE faq_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0');

      await run(`
        CREATE TABLE IF NOT EXISTS faqs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
          question_ko TEXT NOT NULL,
          question_en TEXT,
          answer_ko TEXT NOT NULL,
          answer_en TEXT,
          sort_order INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const faqColumns = [
        ['category_id', 'UUID REFERENCES faq_categories(id) ON DELETE SET NULL'],
        ['question_ko', 'TEXT'],
        ['question_en', 'TEXT'],
        ['answer_ko', 'TEXT'],
        ['answer_en', 'TEXT'],
        ['sort_order', 'INTEGER DEFAULT 0'],
        ['view_count', 'INTEGER DEFAULT 0'],
        ['is_active', 'BOOLEAN DEFAULT TRUE'],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
      ];
      for (const [column, definition] of faqColumns) {
        await run(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('faqs', ['category_id', 'question_en', 'answer_en', 'sort_order', 'view_count', 'is_active', 'created_at', 'updated_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS inquiries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          category VARCHAR(100),
          title VARCHAR(300) NOT NULL,
          content TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'open',
          response TEXT,
          responded_by UUID REFERENCES users(id),
          responded_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const inquiryColumns = [
        ['user_id', 'UUID REFERENCES users(id) ON DELETE SET NULL'],
        ['category', 'VARCHAR(100)'],
        ['title', 'VARCHAR(300)'],
        ['content', 'TEXT'],
        ['status', "VARCHAR(50) DEFAULT 'open'"],
        ['response', 'TEXT'],
        ['responded_by', 'UUID REFERENCES users(id)'],
        ['responded_at', 'TIMESTAMP WITH TIME ZONE'],
        ['created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
      ];
      for (const [column, definition] of inquiryColumns) {
        await run(`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      await dropNotNull('inquiries', ['user_id', 'category', 'status', 'response', 'responded_by', 'responded_at', 'created_at']);

      await run(`
        CREATE TABLE IF NOT EXISTS consultations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          consultant_id UUID REFERENCES users(id) ON DELETE SET NULL,
          scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_minutes INTEGER DEFAULT 30,
          status VARCHAR(50) DEFAULT '예약됨',
          topic VARCHAR(200),
          method VARCHAR(50) DEFAULT '온라인',
          summary TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);
      for (const [column, definition] of [
        ['method', "VARCHAR(50) DEFAULT '온라인'"],
        ['summary', 'TEXT'],
        ['notes', 'TEXT'],
        ['updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'],
        ['completed_at', 'TIMESTAMP WITH TIME ZONE'],
      ]) {
        await run(`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }

      await run(`
        CREATE TABLE IF NOT EXISTS consultant_availability (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          consultant_id UUID REFERENCES users(id) ON DELETE CASCADE,
          available_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          is_booked BOOLEAN DEFAULT FALSE,
          consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS consultation_records (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
          author_id UUID REFERENCES users(id) ON DELETE SET NULL,
          record_type VARCHAR(20) NOT NULL DEFAULT 'text',
          content TEXT,
          file_url VARCHAR(500),
          file_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS qa_questions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(300) NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(100),
          view_count INTEGER DEFAULT 0,
          is_answered BOOLEAN DEFAULT FALSE,
          is_pinned BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS qa_answers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          question_id UUID REFERENCES qa_questions(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          is_accepted BOOLEAN DEFAULT FALSE,
          upvotes INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(100) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_by UUID REFERENCES users(id),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      try {
        await run(`
          INSERT INTO site_settings (key, value)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (key) DO NOTHING
        `, [
          'home_cms',
          JSON.stringify({
            platformName: '2026 우수선수 육성인력 교육',
            platformNameEn: '2026 Elite Athlete Development Staff Training',
            logoImageUrl: '/logo.png',
            heroEyebrow: 'NO SPORTS NO FUTURE',
            heroTitle: '우수선수 육성인력 교육',
            heroSubtitle: '훈련, 선수 지원, 상담, 교육과 선수단 운영을 하나의 플랫폼에서 관리합니다.',
            primaryButtonText: '로그인',
            secondaryButtonText: '회원가입',
            backgroundVideoUrl: 'https://videos.pexels.com/video-files/3191251/3191251-uhd_2560_1440_25fps.mp4',
            loginHelperText: '발급받은 계정으로 로그인하세요. 계정이 없으면 회원가입을 진행해 주세요.',
            testAccountsText: '코치 체험: coach@asiangames.com / demo1234\n선수 체험: athlete@asiangames.com / demo1234',
          }),
        ]);

        // Replace values still holding an earlier default with the current
        // default. Anything an admin customised is left alone.
        const legacyDefaults = {
          platformName: [['2026 아이치-나고야 아시안게임 국가대표 선수단 플랫폼'], '2026 우수선수 육성인력 교육'],
          platformNameEn: [['2026 Aichi-Nagoya Asian Games Delegation Platform'], '2026 Elite Athlete Development Staff Training'],
          logoImageUrl: [[''], '/logo.png'],
          heroEyebrow: [['2026 Aichi-Nagoya Asian Games', '2026 아이치·나고야 아시안게임'], 'NO SPORTS NO FUTURE'],
          heroTitle: [['National Team Delegation Platform', '국가대표 선수단 통합 플랫폼'], '우수선수 육성인력 교육'],
          heroSubtitle: [['Training, athlete support, consultation, and team operations in one real-data testing environment.'], '훈련, 선수 지원, 상담, 교육과 선수단 운영을 하나의 플랫폼에서 관리합니다.'],
          primaryButtonText: [['Sign In'], '로그인'],
          secondaryButtonText: [['Create account'], '회원가입'],
          loginHelperText: [['Use real API accounts or the seeded test accounts below.'], '발급받은 계정으로 로그인하세요. 계정이 없으면 회원가입을 진행해 주세요.'],
          testAccountsText: [['Admin: admin@asiangames.com / demo1234\nCoach: coach@asiangames.com / demo1234\nAthlete: athlete@asiangames.com / demo1234'], '코치 체험: coach@asiangames.com / demo1234\n선수 체험: athlete@asiangames.com / demo1234'],
        };
        const { rows: homeRows } = await run("SELECT value FROM site_settings WHERE key = 'home_cms'");
        if (homeRows[0]?.value && typeof homeRows[0].value === 'object') {
          const current = homeRows[0].value;
          let changed = false;
          for (const [field, [oldValues, newValue]] of Object.entries(legacyDefaults)) {
            if (oldValues.includes(current[field] ?? '')) {
              current[field] = newValue;
              changed = true;
            }
          }
          if (changed) {
            await run("UPDATE site_settings SET value = $1::jsonb WHERE key = 'home_cms'", [JSON.stringify(current)]);
          }
        }
      } catch (error) {
        console.error('Seed site settings skipped:', error.message);
      }

      try {
        const { rows } = await run('SELECT COUNT(*)::int AS count FROM jobs');
        if (rows[0].count === 0) {
          await run(
            `INSERT INTO jobs (company_name, title_ko, title_en, description_ko, description_en, location, salary_range, contact_info, deadline)
             VALUES
             ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE + INTERVAL '45 days'),
             ($9,$10,$11,$12,$13,$14,$15,$16,CURRENT_DATE + INTERVAL '60 days')`,
            [
              '2026 아이치·나고야 선수단 사무국',
              '\uC120\uC218\uB2E8 \uC6B4\uC601 \uC9C0\uC6D0 \uCF54\uB514\uB124\uC774\uD130',
              'Delegation Operations Coordinator',
              '\uC120\uC218\uB2E8 \uC77C\uC815, \uC774\uB3D9, \uAD50\uC721 \uC6B4\uC601\uC744 \uC9C0\uC6D0\uD558\uB294 \uB2E8\uAE30 \uD504\uB85C\uC81D\uD2B8 \uC5ED\uD560\uC785\uB2C8\uB2E4.',
              'Support delegation scheduling, movement, and education operations.',
              '나고야 / 원격',
              '\uD611\uC758',
              'operations@asiangames.com',
              '스포츠 경기력 향상 센터',
              '\uD68C\uBCF5 \uBC0F \uCEE8\uB514\uC154\uB2DD \uBCF4\uC870 \uC2A4\uD0DC\uD504',
              'Recovery and Conditioning Assistant',
              '\uD6C8\uB828 \uD6C4 \uD68C\uBCF5 \uD504\uB85C\uADF8\uB7A8, \uCEE8\uB514\uC158 \uCCB4\uD06C, \uC790\uB8CC \uC815\uB9AC\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4.',
              'Assist recovery programming, condition checks, and training documentation.',
              '아이치',
              '\uD611\uC758',
              'performance@asiangames.com',
            ]
          );
        }
      } catch (error) {
        console.error('Seed jobs skipped:', error.message);
      }

      try {
        const { rows } = await run('SELECT COUNT(*)::int AS count FROM announcements');
        if (rows[0].count === 0) {
          await run(
            `INSERT INTO announcements (title_ko, title_en, content_ko, content_en, is_pinned, is_active, created_by)
             VALUES ($1,$2,$3,$4,TRUE,TRUE,$5), ($6,$7,$8,$9,FALSE,TRUE,$10)`,
            [
              '\uC120\uC218\uB2E8 \uD50C\uB7AB\uD3FC \uC6B4\uC601 \uC548\uB0B4',
              'Delegation Platform Now Open',
              '2026 \uC544\uC774\uCE58-\uB098\uACE0\uC57C \uC544\uC2DC\uC548\uAC8C\uC784 \uC120\uC218\uB2E8 \uD50C\uB7AB\uD3FC\uC774 \uC6B4\uC601\uC744 \uC2DC\uC791\uD588\uC2B5\uB2C8\uB2E4. \uAD50\uC721, \uC0C1\uB2F4, \uCC44\uC6A9 \uC815\uBCF4\uB97C \uC21C\uCC28\uC801\uC73C\uB85C \uC5C5\uB370\uC774\uD2B8\uD569\uB2C8\uB2E4.',
              'The delegation platform is now open. Training, consultation, and opportunity information will be updated regularly.',
              '00000000-0000-0000-0000-000000000001',
              '\uAE30\uCD08 \uCEE8\uB514\uC154\uB2DD \uAD50\uC721 \uB4F1\uB85D \uC548\uB0B4',
              'Base Conditioning Course Registration',
              '\uC120\uC218\uB2E8 \uAE30\uCD08 \uCEE8\uB514\uC154\uB2DD \uAD50\uC721 \uC790\uB8CC\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD559\uC2B5 \uC790\uB8CC \uBA54\uB274\uC5D0\uC11C \uD655\uC778\uD574 \uC8FC\uC138\uC694.',
              'Base conditioning learning material is available in the Learning menu.',
              '00000000-0000-0000-0000-000000000001',
            ]
          );
        }
      } catch (error) {
        console.error('Seed announcements skipped:', error.message);
      }

      try {
        const { rows } = await run('SELECT COUNT(*)::int AS count FROM courses');
        if (rows[0].count === 0) {
          await run(
            `INSERT INTO courses (title_ko, title_en, description_ko, description_en, type, duration_minutes, is_featured, instructor_id)
             VALUES ($1,$2,$3,$4,'video',35,TRUE,$5), ($6,$7,$8,$9,'document',20,FALSE,$10)`,
            [
              '\uC544\uC2DC\uC548\uAC8C\uC784 \uAE30\uBCF8 \uCEE8\uB514\uC154\uB2DD',
              'Asian Games Base Conditioning',
              '\uB300\uD68C \uC900\uBE44 \uAE30\uAC04\uC758 \uAE30\uBCF8 \uCCB4\uB825 \uAD00\uB9AC\uC640 \uD68C\uBCF5 \uB8E8\uD2F4\uC744 \uB2E4\uB8F9\uB2C8\uB2E4.',
              'Covers base fitness care and recovery routines during preparation.',
              '00000000-0000-0000-0000-000000000002',
              '\uC120\uC218\uB2E8 \uC601\uC591 \uAD00\uB9AC \uCCB4\uD06C\uB9AC\uC2A4\uD2B8',
              'Delegation Nutrition Checklist',
              '\uD6C8\uB828 \uBC0F \uC774\uB3D9 \uC77C\uC815 \uC911 \uD544\uC694\uD55C \uC601\uC591 \uAD00\uB9AC \uAE30\uC900\uC744 \uC815\uB9AC\uD55C \uC790\uB8CC\uC785\uB2C8\uB2E4.',
              'Nutrition guidance for training and travel schedules.',
              '00000000-0000-0000-0000-000000000002',
            ]
          );
        }
      } catch (error) {
        console.error('Seed courses skipped:', error.message);
      }

      try {
        const { rows } = await run('SELECT COUNT(*)::int AS count FROM faqs');
        if (rows[0].count === 0) {
          const category = await run(
            `INSERT INTO faq_categories (name_ko, name_en, sort_order)
             VALUES ($1,$2,1) RETURNING id`,
            ['\uD50C\uB7AB\uD3FC \uC774\uC6A9', 'Platform Use']
          );
          await run(
            `INSERT INTO faqs (category_id, question_ko, question_en, answer_ko, answer_en, sort_order)
             VALUES ($1,$2,$3,$4,$5,1), ($1,$6,$7,$8,$9,2)`,
            [
              category.rows[0].id,
              '\uD14C\uC2A4\uD2B8 \uACC4\uC815\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?',
              'What are the test accounts?',
              '\uCF54\uCE58, \uC120\uC218 \uACC4\uC815\uC73C\uB85C \uAE30\uB2A5\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uBE44\uBC00\uBC88\uD638\uB294 demo1234\uC785\uB2C8\uB2E4.',
              'You can test coach and athlete flows. The password is demo1234.',
              '\uC790\uB8CC\uAC00 \uBCF4\uC774\uC9C0 \uC54A\uC73C\uBA74 \uC5B4\uB5BB\uAC8C \uD558\uB098\uC694?',
              'What if content is missing?',
              '\uAD00\uB9AC\uC790 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD55C \uB4A4 \uAC15\uC758, \uACF5\uC9C0, \uCC44\uC6A9 \uC815\uBCF4\uB97C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
              'Log in as admin to add courses, notices, and job information.',
            ]
          );
        }
      } catch (error) {
        console.error('Seed FAQs skipped:', error.message);
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
};

// Runs ensureCoreSchema at most once per deployed schema version. Warm
// requests skip straight through; a cold start costs one SELECT.
const ensureSchemaOnce = () => {
  if (!schemaChecked) {
    schemaChecked = (async () => {
      try {
        const { rows } = await run("SELECT value FROM site_settings WHERE key = 'schema_version'");
        if (rows[0]?.value === SCHEMA_VERSION) return;
      } catch {
        // site_settings missing: fresh database
      }
      await ensureCoreSchema();
      await run(
        `INSERT INTO site_settings (key, value) VALUES ('schema_version', to_jsonb($1::text))
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [SCHEMA_VERSION]
      );
    })().catch((error) => {
      schemaChecked = null;
      throw error;
    });
  }
  return schemaChecked;
};

module.exports = {
  // Schema migrations are an administrative/startup concern. Running the full
  // migration before every query makes serverless cold starts exceed Vercel's
  // function timeout, so request handlers must query the provisioned database
  // directly.
  query: run,
  ensureCoreSchema,
  ensureSchemaOnce,
  isConfigured: Boolean(connectionString || process.env.DB_HOST || process.env.POSTGRES_HOST),
  pool,
};

