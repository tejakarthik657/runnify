// auth-service/oauth.js
// ============================================================
// OAUTH — Google + Apple via Passport.js
// ============================================================
const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy  = require('passport-apple');
const jwt           = require('jsonwebtoken');
const { User }      = require('../config/models');

const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = '7d';

const ALLOWED_COLORS = ['#00FF88', '#0080FF', '#FF2244', '#FFB300', '#FF00AA', '#00DDFF', '#FF5500'];

function generateHashcode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TR-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function issueTokens(user) {
  const payload = { sub: user._id.toString(), username: user.username, color: user.color };
  return {
    accessToken:  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL }),
    refreshToken: jwt.sign({ sub: user._id.toString(), type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL }),
  };
}

/**
 * Find or create a user from OAuth profile data
 */
async function findOrCreateOAuthUser(provider, providerId, email, displayName) {
  // Try find by OAuth ID
  let user = await User.findOne({ [`oauth.${provider}`]: providerId });
  if (user) return user;

  // Try find by email
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // Link OAuth to existing account
      await User.updateOne({ _id: user._id }, { $set: { [`oauth.${provider}`]: providerId } });
      return user;
    }
  }

  // Create new user
  // Generate a unique username from displayName
  let baseUsername = (displayName || email?.split('@')[0] || 'runner')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 20);

  // Ensure uniqueness by appending numbers if needed
  let username = baseUsername;
  let attempt  = 0;
  while (await User.findOne({ username })) {
    attempt++;
    username = `${baseUsername}${attempt}`;
  }

  // Random color assignment for OAuth users
  const color    = ALLOWED_COLORS[Math.floor(Math.random() * ALLOWED_COLORS.length)];
  let hashcode   = generateHashcode();
  while (await User.findOne({ hashcode })) hashcode = generateHashcode();

  user = await User.create({
    username,
    email:        email ? email.toLowerCase() : `${providerId}@${provider}.oauth`,
    passwordHash: 'OAUTH_NO_PASSWORD',
    color,
    hashcode,
    [`oauth.${provider}`]: providerId,
    schemaVersion: 'v1',
  });

  return user;
}

// ─────────────────────────────────────────────────────────────
// GOOGLE STRATEGY
// ─────────────────────────────────────────────────────────────
function setupGoogleStrategy() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return false;
  }

  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${process.env.API_BASE_URL || 'http://localhost:4000'}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const user  = await findOrCreateOAuthUser('google', profile.id, email, profile.displayName);
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));

  return true;
}

// ─────────────────────────────────────────────────────────────
// APPLE STRATEGY
// ─────────────────────────────────────────────────────────────
function setupAppleStrategy() {
  if (
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY ||
    !process.env.APPLE_BUNDLE_ID
  ) {
    return false;
  }

  passport.use(new AppleStrategy(
    {
      teamID:           process.env.APPLE_TEAM_ID,
      keyID:            process.env.APPLE_KEY_ID,
      privateKeyString: process.env.APPLE_PRIVATE_KEY,
      bundleID:         process.env.APPLE_BUNDLE_ID,
      passport:         true,
    },
    async (user, done) => {
      try {
        // Apple returns: user.id, user.email (first sign-in only)
        const email = user.email;
        const oauthUser  = await findOrCreateOAuthUser('apple', user.id, email, email?.split('@')[0]);
        done(null, oauthUser);
      } catch (err) {
        done(err);
      }
    }
  ));

  return true;
}

// ─────────────────────────────────────────────────────────────
// Setup OAuth routes
// ─────────────────────────────────────────────────────────────
function setupOAuthRoutes(app) {
  const googleEnabled = setupGoogleStrategy();
  const appleEnabled = setupAppleStrategy();
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Google login
  if (googleEnabled) {
    app.get('/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/auth/login?error=google' }),
      (req, res) => {
        const { accessToken, refreshToken } = issueTokens(req.user);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
      }
    );
  }

  // Apple login
  if (appleEnabled) {
    app.post('/auth/apple',
      passport.authenticate('apple', { failureRedirect: '/auth/login?error=apple' }),
      (req, res) => {
        const { accessToken, refreshToken } = issueTokens(req.user);
        res.json({ accessToken, refreshToken, user: req.user });
      }
    );
  }
}

module.exports = {
  setupOAuthRoutes,
  issueTokens,
  findOrCreateOAuthUser,
};
