const { generateToken, generateRefreshToken } = require('../middleware/auth');

function createAuthTokens(user) {
	return {
		accessToken: generateToken(user._id.toString(), user.email),
		refreshToken: generateRefreshToken(user._id.toString()),
	};
}

module.exports = {
	createAuthTokens,
};
