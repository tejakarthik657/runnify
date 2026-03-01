function initializeOAuth() {
	return {
		googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
		appleConfigured: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID),
	};
}

module.exports = {
	initializeOAuth,
};
