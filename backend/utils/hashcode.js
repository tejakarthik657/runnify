const { UserService } = require('../core/services');

async function generateHashcode() {
	return UserService.generateHashcode();
}

module.exports = {
	generateHashcode,
};
