const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const db = require('./database');
const { jwtSecret } = require('./secrets');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret
};

module.exports = (passport) => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        const result = await db.query(
          'SELECT id, email, name_ko, name_en, role, status FROM users WHERE id = $1',
          [payload.id]
        );

        if (result.rows.length > 0) {
          return done(null, result.rows[0]);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let result = await db.query(
              'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
              ['google', profile.id]
            );

            if (result.rows.length > 0) {
              // Update last login
              await db.query(
                'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
                [result.rows[0].id]
              );
              return done(null, result.rows[0]);
            }

            // Check if user exists with same email
            result = await db.query(
              'SELECT * FROM users WHERE email = $1',
              [profile.emails[0].value]
            );

            if (result.rows.length > 0) {
              // Link OAuth to existing account
              await db.query(
                'UPDATE users SET oauth_provider = $1, oauth_id = $2, last_login_at = CURRENT_TIMESTAMP WHERE id = $3',
                ['google', profile.id, result.rows[0].id]
              );
              return done(null, result.rows[0]);
            }

            // Create new user
            const newUser = await db.query(
              `INSERT INTO users (email, name_ko, name_en, oauth_provider, oauth_id, profile_image, status)
               VALUES ($1, $2, $3, $4, $5, $6, 'active')
               RETURNING *`,
              [
                profile.emails[0].value,
                profile.displayName,
                profile.displayName,
                'google',
                profile.id,
                profile.photos[0]?.value
              ]
            );

            return done(null, newUser.rows[0]);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }
};
