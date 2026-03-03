/**
 * Shared GPS tracks for test scenarios
 */

// Hyderabad Track (Clean run, ~1.4 km)
const HYDERABAD_TRACK = [
    { lat: 17.4100, lng: 78.4500, ts: Date.now() },
    { lat: 17.4109, lng: 78.4509, ts: Date.now() + 3000 },
    { lat: 17.4118, lng: 78.4518, ts: Date.now() + 6000 },
    { lat: 17.4127, lng: 78.4527, ts: Date.now() + 9000 },
    { lat: 17.4136, lng: 78.4536, ts: Date.now() + 12000 },
    { lat: 17.4145, lng: 78.4545, ts: Date.now() + 15000 },
    { lat: 17.4154, lng: 78.4554, ts: Date.now() + 18000 },
    { lat: 17.4163, lng: 78.4563, ts: Date.now() + 21000 },
    { lat: 17.4172, lng: 78.4572, ts: Date.now() + 24000 },
    { lat: 17.4181, lng: 78.4581, ts: Date.now() + 27000 }
];

// Car Cheat Track (Hyderabad, 60km/h = 16.7 m/s)
// Points spaced 50m apart (0.00045 degrees lat) every 3 seconds
const CAR_CHEAT_TRACK = Array.from({ length: 10 }, (_, i) => ({
    lat: 17.4100 + (i * 0.00045),
    lng: 78.4500,
    ts: Date.now() + (i * 3000),
    accuracy: 5
}));

// Teleport Track (Hyderabad to Delhi instantly)
const TELEPORT_TRACK = [
    { lat: 17.4100, lng: 78.4500, ts: Date.now(), accuracy: 5 },
    { lat: 28.6139, lng: 77.2090, ts: Date.now() + 3000, accuracy: 5 }
];

module.exports = {
    HYDERABAD_TRACK,
    CAR_CHEAT_TRACK,
    TELEPORT_TRACK
};
