const { UserService } = require('../core/services');

async function getProfile(req, res, next) {
	try {
		const profile = await UserService.getPublicProfile(req.params.id);
		res.json({ profile });
	} catch (error) {
		next(error);
	}
}

async function searchUsers(req, res, next) {
	try {
		const q = req.query.q || '';
		const limit = Number(req.query.limit || 10);
		const users = await UserService.search(q, limit);
		res.json({ users });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getProfile,
	searchUsers,
};
