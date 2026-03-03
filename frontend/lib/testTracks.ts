// lib/testTracks.ts
// All coordinates are in Hyderabad, Telangana
// Each track is a real-world path scaled to test a specific scenario

export type GpsPoint = { lat: number; lng: number; accuracy?: number; altitude?: number };
export type TestTrack = { id: string; name: string; description: string; points: GpsPoint[]; expectedResult: string; };

// ── Helpers ───────────────────────────────────────────────────
// Walk N steps from a start point in a direction
function walk(startLat: number, startLng: number, steps: number, dLat: number, dLng: number, jitter = 0.00003): GpsPoint[] {
    const pts: GpsPoint[] = [];
    for (let i = 0; i < steps; i++) {
        pts.push({
            lat: startLat + i * dLat + (Math.random() - 0.5) * jitter,
            lng: startLng + i * dLng + (Math.random() - 0.5) * jitter,
            accuracy: 6 + Math.random() * 6,
            altitude: 540 + Math.random() * 5, // Hyderabad elevation ~540m
        });
    }
    return pts;
}

// ─────────────────────────────────────────────────────────────
// TRACK 1 — Normal clean run (claims new hexes)
// Simulates a 10-minute jog through Banjara Hills
// Expected: 8–12 hexes claimed, credits awarded
// ─────────────────────────────────────────────────────────────
export const TRACK_CLEAN_RUN: TestTrack = {
    id: 'clean_run',
    name: '✅ Clean Run — Banjara Hills',
    description: 'Normal 10-min jog. Claims new territory. All credits should be awarded.',
    expectedResult: '8–12 hexes claimed, full credits, clean anti-cheat verdict',
    points: [
        ...walk(17.4100, 78.4500, 20, 0.00015, 0.00010),  // jog north-east
        ...walk(17.4130, 78.4520, 15, 0.00010, 0.00015),  // curve right
        ...walk(17.4145, 78.4543, 10, 0.00005, 0.00020),  // head east
        ...walk(17.4150, 78.4563, 10, -0.00010, 0.00015), // curve south
    ],
};

// ─────────────────────────────────────────────────────────────
// TRACK 2 — Invasion run (enters enemy territory)
// Runs through hexes already owned by another user
// Expected: Invasion triggers, defender notified, ownership transfers
// ─────────────────────────────────────────────────────────────
export const TRACK_INVASION: TestTrack = {
    id: 'invasion',
    name: '⚔️ Invasion Run — Jubilee Hills',
    description: 'Run through territory owned by another user. Tests invasion logic.',
    expectedResult: 'Defender loses hexes + credits. Attacker gains territory. Live notification sent.',
    points: walk(17.4250, 78.4100, 30, 0.00012, 0.00012),
};

// ─────────────────────────────────────────────────────────────
// TRACK 3 — Revisit run (runs own territory)
// Revisiting resets decay timer but doesn't re-award credits
// Expected: hexesRevisited count increases, lastActiveAt resets, no double credits
// ─────────────────────────────────────────────────────────────
export const TRACK_REVISIT: TestTrack = {
    id: 'revisit',
    name: '🔄 Revisit Run — Own Territory',
    description: 'Run over territory you already own. Should refresh decay timer only.',
    expectedResult: 'hexesRevisited increases, no new credits, lastActiveAt updated.',
    points: walk(17.4100, 78.4500, 25, 0.00015, 0.00010), // same area as TRACK_CLEAN_RUN
};

// ─────────────────────────────────────────────────────────────
// TRACK 4 — Car speed cheat (fails anti-cheat)
// Points spaced as if travelling at 60 km/h
// Expected: disqualified, 0 credits, 0 territory claimed
// ─────────────────────────────────────────────────────────────
export const TRACK_CAR_CHEAT: TestTrack = {
    id: 'car_cheat',
    name: '🚗 Car Speed Cheat — ORR Highway',
    description: 'GPS points at 60 km/h speed. Anti-cheat Layer 1 should disqualify.',
    expectedResult: 'verdict: disqualified, credits: 0, strikeCount incremented.',
    // 60 km/h = 16.7 m/s. 3 second interval = 50m per point = ~0.00045 degrees lat per step
    points: walk(17.4500, 78.5000, 30, 0.00045, 0.00045, 0), // no jitter — perfectly smooth car
};

// ─────────────────────────────────────────────────────────────
// TRACK 5 — Phone shaking cheat (fails anti-cheat)
// High frequency bearing changes, near-zero displacement
// Expected: path_chaotic_shaking flag, partial or disqualified
// ─────────────────────────────────────────────────────────────
export const TRACK_SHAKING_CHEAT: TestTrack = {
    id: 'shaking_cheat',
    name: '📱 Phone Shaking Cheat',
    description: 'Chaotic random GPS points simulating phone shaking in one spot.',
    expectedResult: 'path_chaotic_shaking flag raised, credits reduced or zeroed.',
    points: Array.from({ length: 40 }, (_, i) => ({
        lat: 17.4200 + (Math.random() - 0.5) * 0.002, // random within ~200m radius
        lng: 78.4600 + (Math.random() - 0.5) * 0.002,
        accuracy: 20 + Math.random() * 30,                  // poor accuracy (shaking)
        altitude: 540,
    })),
};

// ─────────────────────────────────────────────────────────────
// TRACK 6 — Drive-by cheat (fails dwell time check)
// Moves fast enough to touch hexes but never stays ≥8 seconds
// Expected: all hexes fail dwell filter, 0 territory claimed
// ─────────────────────────────────────────────────────────────
export const TRACK_DRIVEBY_CHEAT: TestTrack = {
    id: 'driveby_cheat',
    name: '💨 Drive-By Cheat — Fast Hex Touch',
    description: 'Speed within legal limit but dwell time in each hex is <8 seconds.',
    expectedResult: 'hexesFilteredByDwell = all hexes, 0 territory claimed.',
    // 5 m/s legal but fast. At 3s interval = 15m per step. Res-9 hex = ~150m wide.
    // So user crosses each hex in ~3 points = 9 seconds. Just under threshold if hex is small.
    points: walk(17.4300, 78.4700, 35, 0.00020, 0.00020, 0.000005), // very little jitter
};

// ─────────────────────────────────────────────────────────────
// TRACK 7 — GPS teleport (spoofing app)
// Jumps impossibly large distances between points
// Expected: altitude_teleport or speed_hard_violation, disqualified
// ─────────────────────────────────────────────────────────────
export const TRACK_TELEPORT_CHEAT: TestTrack = {
    id: 'teleport_cheat',
    name: '🌀 GPS Teleport — Spoofing App',
    description: 'Simulates a GPS spoofing app jumping between locations.',
    expectedResult: 'speed_hard_violation, disqualified, GPS saved as evidence.',
    points: [
        { lat: 17.4100, lng: 78.4500, accuracy: 5 }, // Hyderabad
        { lat: 17.4101, lng: 78.4502, accuracy: 5 }, // normal
        { lat: 28.6139, lng: 77.2090, accuracy: 5 }, // TELEPORT to Delhi (1500 km!)
        { lat: 28.6140, lng: 77.2091, accuracy: 5 }, // normal in Delhi
        { lat: 17.4102, lng: 78.4503, accuracy: 5 }, // teleport back
    ],
};

// ─────────────────────────────────────────────────────────────
// TRACK 8 — Peak hour run (1.5x credits)
// Identical to clean run but processed during peak hours
// Expected: credits = normal * 1.5, peakMultiplier: 1.5 in response
// Note: change your system clock to 7:30am or 6pm to test this
// ─────────────────────────────────────────────────────────────
export const TRACK_PEAK_HOUR: TestTrack = {
    id: 'peak_hour',
    name: '⚡ Peak Hour Run — 1.5x Credits',
    description: 'Same route as clean run but during peak hours (7–9am or 5–7pm).',
    expectedResult: 'peakMultiplier: 1.5 in response, credits = base * 1.5.',
    points: walk(17.4200, 78.4600, 20, 0.00015, 0.00010),
};

// ─────────────────────────────────────────────────────────────
// TRACK 9 — Long run at limit (4 hours)
// Tests the run duration cap
// Expected: run auto-ends at 4h, credits for valid segment only
// ─────────────────────────────────────────────────────────────
export const TRACK_LONG_RUN: TestTrack = {
    id: 'long_run',
    name: '⏱️ Long Run Duration Test',
    description: 'Simulates a very long run to test the 4-hour cap. Use intervalMs: 100 to fast-forward.',
    expectedResult: 'run_auto_ended event fires, partial credits for time within limit.',
    points: walk(17.3850, 78.4867, 200, 0.00010, 0.00010), // lots of points
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// TRACK 10 — Boundary run (city edge)
// Runs near the edge of a city boundary
// Expected: hexes correctly attributed to the right city
// ─────────────────────────────────────────────────────────────
export const TRACK_CITY_EDGE: TestTrack = {
    id: 'city_edge',
    name: '🏙️ City Boundary Run',
    description: 'Runs near the edge of Hyderabad city limits.',
    expectedResult: 'All hexes attributed to correct city, no orphan hexes.',
    points: walk(17.2800, 78.4200, 20, 0.00015, 0.00015),
};

// ─────────────────────────────────────────────────────────────
// SCENARIO TRACKS — For multi-user conflict testing
// ─────────────────────────────────────────────────────────────

export const TRACK_CONFLICT_BASE: TestTrack = {
    id: 'conflict_base',
    name: '🚩 Conflict Test (User A)',
    description: 'First user runs this to claim "Neutral Zone". Starts at Gachibowli.',
    expectedResult: 'Claim neutral territory.',
    points: walk(17.4400, 78.3400, 25, 0.00010, 0.00010),
};

export const TRACK_CONFLICT_INVADER: TestTrack = {
    id: 'conflict_invader',
    name: '⚔️ Conflict Test (User B)',
    description: 'Second user runs this to invade territory claimed by User A.',
    expectedResult: 'Invasion trigger. User A loses hexes/credits. User B gains them.',
    points: walk(17.4405, 78.3405, 20, 0.00010, 0.00010), // Overlaps Conflict Base
};

// ─────────────────────────────────────────────────────────────
// ALL TRACKS — for the test panel
// ─────────────────────────────────────────────────────────────
export const ALL_TRACKS: TestTrack[] = [
    TRACK_CLEAN_RUN,
    TRACK_INVASION,
    TRACK_REVISIT,
    TRACK_CAR_CHEAT,
    TRACK_SHAKING_CHEAT,
    TRACK_DRIVEBY_CHEAT,
    TRACK_TELEPORT_CHEAT,
    TRACK_PEAK_HOUR,
    TRACK_LONG_RUN,
    TRACK_CITY_EDGE,
    TRACK_CONFLICT_BASE,
    TRACK_CONFLICT_INVADER,
    {
        id: 'TRACK_CIRCLE_A',
        name: '⭕ Circular Sortie (User A - Clockwise)',
        description: 'Large 500m radius circle moving CLOCKWISE. 30 points.',
        expectedResult: 'Claim large territory.',
        points: Array.from({ length: 30 }, (_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const radius = 0.005; // ~500m
            return {
                lat: 17.4447 + radius * Math.cos(angle),
                lng: 78.3483 + radius * Math.sin(angle),
                accuracy: 5
            };
        })
    },
    {
        id: 'TRACK_CIRCLE_B',
        name: '⭕ Circular Sortie (User B - Counter)',
        description: 'Overlapping 400m radius circle moving COUNTER-CLOCKWISE. 30 points.',
        expectedResult: 'Invade User A by moving in opposite direction.',
        points: Array.from({ length: 30 }, (_, i) => {
            const angle = -(i / 30) * Math.PI * 2; // Negative angle for counter-clockwise
            const radius = 0.004; // ~400m
            return {
                lat: 17.4447 + radius * Math.cos(angle),
                lng: 78.3483 + radius * Math.sin(angle),
                accuracy: 5
            };
        })
    }
];
