const bcrypt = require('bcryptjs');
const { User } = require('../core/schema');
const { UserService } = require('../core/services');
const { createAuthTokens } = require('./jwt');

async function register(req, res, next) {
	try {
		const { username, email, password, color, city } = req.body;
		const passwordHash = password ? await bcrypt.hash(password, 10) : null;
		const user = await UserService.register({ username, email, passwordHash, color, city });
		const tokens = createAuthTokens(user);
		res.status(201).json({ user: user.publicProfile, ...tokens });
	} catch (error) {
		next(error);
	}
}

async function login(req, res, next) {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user || !user.passwordHash) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const isValid = await bcrypt.compare(password, user.passwordHash);
		if (!isValid) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const tokens = createAuthTokens(user);
		res.json({ user: user.publicProfile, ...tokens });
	} catch (error) {
		next(error);
	}
}

async function me(req, res, next) {
	try {
		const user = await User.findById(req.user.userId);
		if (!user) return res.status(404).json({ error: 'User not found' });
		res.json({ user: user.publicProfile });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	register,
	login,
	me,
};
