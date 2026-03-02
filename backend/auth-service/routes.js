const express = require('express');
const multer = require('multer');
const { authRateLimit } = require('../middleware/rateLimit');
const { authenticateJWT } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { createAuthTokens } = require('./jwt');
const { User } = require('../core/schema');
const {
	storeRefreshToken,
	validateRefreshToken,
	revokeRefreshToken,
	revokeAllSessions,
	getUserSessions,
} = require('../middleware/sessions');
const { register, login, me } = require('./controller');

const router = express.Router();

// Configure multer for profile image uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
	fileFilter: (req, file, cb) => {
		const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error(`Invalid file type: ${file.mimetype}`), false);
		}
	}
});

router.post('/register', authRateLimit, upload.single('profileImage'), register);

router.post('/login', authRateLimit, login);

router.get('/me', authenticateJWT, me);

router.post('/refresh', authRateLimit, async (req, res, next) => {
	try {
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

		const sessionCheck = await validateRefreshToken(refreshToken);
		if (!sessionCheck.valid) return res.status(401).json({ error: sessionCheck.reason });

		const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
		const payload = jwt.verify(refreshToken, secret);
		if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

		const user = await User.findById(payload.userId || payload.sub);
		if (!user) return res.status(401).json({ error: 'User not found' });

		await revokeRefreshToken(refreshToken);
		const tokens = createAuthTokens(user);
		await storeRefreshToken(user._id, tokens.refreshToken, req);

		res.cookie('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.json({ accessToken: tokens.accessToken });
	} catch (error) {
		next(error);
	}
});

router.post('/logout', async (req, res, next) => {
	try {
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		if (refreshToken) await revokeRefreshToken(refreshToken);
		res.clearCookie('refreshToken');
		res.json({ message: 'Logged out' });
	} catch (error) {
		next(error);
	}
});

router.post('/logout-all', authenticateJWT, async (req, res, next) => {
	try {
		await revokeAllSessions(req.user.userId);
		res.clearCookie('refreshToken');
		res.json({ message: 'All devices logged out' });
	} catch (error) {
		next(error);
	}
});

router.get('/sessions', authenticateJWT, async (req, res, next) => {
	try {
		const sessions = await getUserSessions(req.user.userId);
		res.json({ sessions });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
