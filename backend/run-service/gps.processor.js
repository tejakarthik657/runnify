const H3Service = require('./h3.service');

function normalizeGpsBatch(points = []) {
	const processed = [];
	let prev = null;

	for (let index = 0; index < points.length; index += 1) {
		const validated = H3Service.validateGpsPoint(points[index], prev, index);
		if (!validated) continue;
		processed.push(validated);
		if (validated.isValid) prev = validated;
	}

	return processed;
}

module.exports = {
	normalizeGpsBatch,
};
