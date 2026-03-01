const { MapService } = require('../core/services');

async function getTerritoriesByBbox({ minLat, minLng, maxLat, maxLng }) {
	return MapService.getTerritoriesInBbox({ minLat, minLng, maxLat, maxLng });
}

module.exports = {
	getTerritoriesByBbox,
};
