const { generateToken, generateRefreshToken } = require('../middleware/auth');

function createAuthTokens(user) {
	return {
		accessToken: generateToken(user._id.toString(), user.email, {
			expiresIn: '15m',
			username: user.username,
			color: user.color,
			avatarUrl: user.avatarUrl,
		}),
		refreshToken: generateRefreshToken(user._id.toString()),
	};
}

module.exports = {
	createAuthTokens,
};
