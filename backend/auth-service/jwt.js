const { generateToken, generateRefreshToken } = require('../middleware/auth');

function createAuthTokens(user) {
	return {
		accessToken: generateToken(user._id.toString(), user.email, {
			expiresIn: '15m',
			username: user.username,
			color: user.color,
			avatarUrl: user.avatarUrl,
			campus: user.campus || user.city,
			branch: user.branch,
			year: user.year,
		}),
		refreshToken: generateRefreshToken(user._id.toString()),
	};
}

module.exports = {
	createAuthTokens,
};
