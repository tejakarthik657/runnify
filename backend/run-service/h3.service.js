const h3 = require('h3-js');
const { H3Service } = require('../core/services');

const HEX_RESOLUTION = 9;
const MIN_ACCURACY_METERS = 50;

function gpsToHex(lat, lng, resolution = HEX_RESOLUTION) {
	return H3Service.latLngToHex(lat, lng, resolution);
}

function validateGpsPoint(point) {
	if (typeof point?.lat !== 'number' || typeof point?.lng !== 'number') {
		return { valid: false, reason: 'lat/lng must be numbers' };
	}
	if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
		return { valid: false, reason: 'coordinates out of range' };
	}
	if (point.accuracy !== undefined && point.accuracy > MIN_ACCURACY_METERS) {
		return { valid: false, reason: `accuracy ${point.accuracy}m exceeds ${MIN_ACCURACY_METERS}m limit` };
	}
	return { valid: true };
}

function processGpsBatch(points = []) {
	const hexIds = new Set();
	const validPoints = [];
	let rejectedCount = 0;

	for (const point of points) {
		const check = validateGpsPoint(point);
		if (!check.valid) {
			rejectedCount += 1;
			continue;
		}

		const hexId = gpsToHex(point.lat, point.lng);
		hexIds.add(hexId);
		validPoints.push({
			lat: point.lat,
			lng: point.lng,
			accuracy: point.accuracy,
			hexId,
			timestamp: point.timestamp || Date.now(),
		});
	}

	return { validPoints, hexIds, rejectedCount };
}

function calculateDistanceKm(points = []) {
	if (points.length < 2) return 0;
	let total = 0;
	for (let index = 1; index < points.length; index += 1) {
		const current = points[index];
		const previous = points[index - 1];
		total += h3.greatCircleDistance(
			[previous.lat, previous.lng],
			[current.lat, current.lng],
			'km'
		);
	}
	return Math.round(total * 100) / 100;
}

function hexesInBoundingBox(minLat, minLng, maxLat, maxLng, resolution = HEX_RESOLUTION) {
	// Guard against massive bounding boxes that crash the server
	const latDiff = Math.abs(maxLat - minLat);
	const lngDiff = Math.abs(maxLng - minLng);
	if (latDiff > 1 || lngDiff > 1) { // roughly 111km - massive for hex res 9
		console.warn('[H3] Bounding box too large, limiting query area');
		maxLat = minLat + Math.min(latDiff, 0.5);
		maxLng = minLng + Math.min(lngDiff, 0.5);
	}

	const polygon = [
		[minLat, minLng],
		[maxLat, minLng],
		[maxLat, maxLng],
		[minLat, maxLng],
	];
	return h3.polygonToCells(polygon, resolution);
}

module.exports = {
	...H3Service,
	HEX_RESOLUTION,
	gpsToHex,
	validateGpsPoint,
	processGpsBatch,
	calculateDistanceKm,
	hexesInBoundingBox,
};
