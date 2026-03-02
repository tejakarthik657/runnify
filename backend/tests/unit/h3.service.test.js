const {
	gpsToHex,
	validateGpsPoint,
	processGpsBatch,
	calculateDistanceKm,
	hexesInBoundingBox,
} = require('../../run-service/h3.service');

describe('H3 Service', () => {
	test('gpsToHex returns a valid H3 cell string', () => {
		const hexId = gpsToHex(37.7749, -122.4194);
		expect(typeof hexId).toBe('string');
		expect(hexId.length).toBeGreaterThan(10);
	});

	test('gpsToHex is deterministic', () => {
		const first = gpsToHex(28.6139, 77.209);
		const second = gpsToHex(28.6139, 77.209);
		expect(first).toBe(second);
	});

	test('validateGpsPoint rejects high-accuracy GPS (> 50m)', () => {
		const result = validateGpsPoint({ lat: 37.7749, lng: -122.4194, accuracy: 75 });
		expect(result.valid).toBe(false);
		expect(result.reason).toMatch(/accuracy/);
	});

	test('validateGpsPoint accepts valid point', () => {
		const result = validateGpsPoint({ lat: 37.7749, lng: -122.4194, accuracy: 10 });
		expect(result.valid).toBe(true);
	});

	test('validateGpsPoint rejects out-of-range coordinates', () => {
		expect(validateGpsPoint({ lat: 95, lng: 0 }).valid).toBe(false);
		expect(validateGpsPoint({ lat: 0, lng: 200 }).valid).toBe(false);
	});

	test('processGpsBatch returns unique hex IDs', () => {
		const points = [
			{ lat: 37.7749, lng: -122.4194, accuracy: 5 },
			{ lat: 37.7749, lng: -122.4194, accuracy: 5 },
			{ lat: 37.775, lng: -122.4194, accuracy: 5 },
		];

		const { hexIds, validPoints, rejectedCount } = processGpsBatch(points);
		expect(rejectedCount).toBe(0);
		expect(hexIds.size).toBeLessThanOrEqual(validPoints.length);
	});

	test('processGpsBatch rejects low-accuracy points', () => {
		const points = [
			{ lat: 37.7749, lng: -122.4194, accuracy: 5 },
			{ lat: 37.775, lng: -122.4195, accuracy: 100 },
		];

		const { rejectedCount } = processGpsBatch(points);
		expect(rejectedCount).toBe(1);
	});

	test('calculateDistanceKm returns 0 for single point', () => {
		expect(calculateDistanceKm([{ lat: 37.7749, lng: -122.4194 }])).toBe(0);
	});

	test('calculateDistanceKm is roughly correct for known distance', () => {
		const km = calculateDistanceKm([
			{ lat: 40.7128, lng: -74.006 },
			{ lat: 34.0522, lng: -118.2437 },
		]);
		expect(km).toBeGreaterThan(3800);
		expect(km).toBeLessThan(4100);
	});

	test('hexesInBoundingBox returns array of hex IDs', () => {
		const hexes = hexesInBoundingBox(37.77, -122.43, 37.78, -122.41);
		expect(Array.isArray(hexes)).toBe(true);
		expect(hexes.length).toBeGreaterThan(0);
	});
});
