/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          TERRITORY RUN — COMPLETE DATABASE SCHEMA                   ║
 * ║          MongoDB + Mongoose — All Collections End-to-End            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Collections:
 *  1.  users              — accounts, identity, stats, settings
 *  2.  territories        — hex ownership + invasion history
 *  3.  runs               — every GPS session ever recorded
 *  4.  gps_points         — raw GPS stream per run (separate for perf)
 *  5.  credits_ledger     — every credit change ever (immutable audit log)
 *  6.  invasions          — invasion events (separate for analytics)
 *  7.  leaderboard_cache  — pre-computed rank snapshots
 *  8.  notifications      — all notification types per user
 *  9.  chat_messages      — global / city / DM chat
 * 10.  chat_rooms         — room definitions + membership
 * 11.  achievements       — definitions + earned status per user
 * 12.  daily_proofs       — blockchain anchoring records
 * 13.  reports            — user abuse/cheat reports
 * 14.  sessions           — refresh token tracking
 * 15.  city_stats         — aggregate city-level metrics
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─────────────────────────────────────────────────────────────
// SHARED SUB-SCHEMAS & CONSTANTS
// ─────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 'v1';
const H3_RESOLUTION = 9;

const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true } // [lng, lat]
}, { _id: false });

const PLAYER_COLORS = [
  '#00FF88', // Neon Green
  '#0080FF', // Electric Blue
  '#FF2244', // Crimson Red
  '#FFB300', // Amber Gold
  '#FF00AA', // Magenta
  '#00DDFF', // Cyan
  '#FF5500', // Deep Orange
  '#FFFFFF', // Prestige White (rank #1 unlock only)
];

const NOTIFICATION_TYPES = [
  'invasion_alert',
  'rank_drop',
  'rank_up',
  'streak_reminder',
  'streak_broken',
  'achievement_unlocked',
  'weekly_summary',
  'nearby_activity',
  'territory_decayed',
  'credits_low',
  'new_rival',
  'dm_received',
  'system',
];


// ═══════════════════════════════════════════════════════════════════════
// 1. USERS
// ═══════════════════════════════════════════════════════════════════════

const PrivacySettingsSchema = new Schema({
  hideLocationFromMap: { type: Boolean, default: false },
  hideStatsFromPublic: { type: Boolean, default: false },
  allowDirectMessages: { type: Boolean, default: true },
  showRunHistory: { type: Boolean, default: true },
  showInNearbyActivity: { type: Boolean, default: true },
}, { _id: false });

const NotificationPrefsSchema = new Schema({
  invasionAlerts: { type: Boolean, default: true },
  rankChanges: { type: Boolean, default: true },
  streakReminders: { type: Boolean, default: true },
  weeklySummary: { type: Boolean, default: true },
  nearbyActivity: { type: Boolean, default: false },
  achievements: { type: Boolean, default: true },
  dmMessages: { type: Boolean, default: true },
  quietHoursStart: { type: Number, default: 23 }, // 11pm local
  quietHoursEnd: { type: Number, default: 7 }, // 7am local
}, { _id: false });

const UserStatsSchema = new Schema({
  // Lifetime totals
  totalKm: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 },
  totalHexesClaimed: { type: Number, default: 0 },
  totalHexesInvaded: { type: Number, default: 0 },
  totalHexesLost: { type: Number, default: 0 },
  totalCreditsEarned: { type: Number, default: 0 },
  totalCreditsLost: { type: Number, default: 0 },

  // Records
  longestRunKm: { type: Number, default: 0 },
  mostHexesInOneRun: { type: Number, default: 0 },
  mostCreditsInOneRun: { type: Number, default: 0 },
  peakHexesOwned: { type: Number, default: 0 },
  peakRank: { type: Number, default: null },

  // Streaks
  currentStreak: { type: Number, default: 0 }, // days
  longestStreak: { type: Number, default: 0 },
  lastRunDate: { type: Date, default: null },
}, { _id: false });

const UserSchema = new Schema({
  // Identity
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20, match: /^[a-zA-Z0-9_]+$/ },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null }, // null if OAuth-only
  hashcode: { type: String, required: true, unique: true }, // TR-A4F2

  // Profile
  color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/, default: '#00FF88' },
  colorUnlocked: { type: [String], default: ['#00FF88', '#0080FF', '#FF2244', '#FFB300', '#FF00AA', '#00DDFF', '#FF5500'] },
  avatarUrl: { type: String, default: null },
  bio: { type: String, default: '', maxlength: 160 },
  city: { type: String, default: null, index: true },
  country: { type: String, default: null },
  homeLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    city: { type: String, default: null },
    updatedAt: { type: Date, default: null },
  },

  // OAuth
  googleId: { type: String, default: null, sparse: true },
  appleId: { type: String, default: null, sparse: true },

  // Game state
  credits: { type: Number, default: 0, min: 0, index: true },
  hexesOwned: { type: Number, default: 0 },
  globalRank: { type: Number, default: null },
  cityRank: { type: Number, default: null },
  isPrestige: { type: Boolean, default: false }, // City #1 ever

  // Faction (Global Territory Wars)
  faction: { type: String, enum: ['red', 'blue', 'green'], default: null, index: true }, // null = not chosen yet
  factionJoinedAt: { type: Date, default: null },

  // Stats embedded for fast dashboard reads
  stats: { type: UserStatsSchema, default: () => ({}) },

  // Settings
  privacy: { type: PrivacySettingsSchema, default: () => ({}) },
  notifications: { type: NotificationPrefsSchema, default: () => ({}) },
  timezone: { type: String, default: 'UTC' },

  // Rivals (bidirectional — stored on both users)
  rivals: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    clashCount: { type: Number, default: 0 },
    lastClashAt: { type: Date },
    named: { type: Boolean, default: false }, // true once 3+ clashes
  }],

  // Moderation
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  reportCount: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },

  // Anti-cheat monitoring
  antiCheat: {
    strikeCount: { type: Number, default: 0 },      // cumulative violations
    shadowBanned: { type: Boolean, default: false },  // silent ban = no credits earned
    shadowBannedAt: { type: Date, default: null },
    lastFlaggedRun: { type: Date, default: null },
    consecutiveFlaggedRuns: { type: Number, default: 0 },
  },

  // Versioning & dates
  schemaVersion: { type: String, default: SCHEMA_VERSION },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  lastRunAt: { type: Date, default: null },
}, { timestamps: true, collection: 'users_v1' });

// Indexes
UserSchema.index({ city: 1, credits: -1 });
UserSchema.index({ globalRank: 1 });
UserSchema.index({ 'stats.currentStreak': -1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ createdAt: -1 }); // for weekly growth calculations
UserSchema.index({ isBanned: 1, createdAt: -1 }); // landing page stats
UserSchema.index({ 'antiCheat.shadowBanned': 1 }); // filter for leaderboards

// Virtual: public profile (strips sensitive fields)
UserSchema.virtual('publicProfile').get(function () {
  return {
    _id: this._id,
    username: this.username,
    hashcode: this.hashcode,
    color: this.color,
    avatarUrl: this.avatarUrl,
    credits: this.privacy.hideStatsFromPublic ? null : this.credits,
    hexesOwned: this.privacy.hideStatsFromPublic ? null : this.hexesOwned,
    globalRank: this.globalRank,
    city: this.city,
    homeLocation: this.homeLocation
      ? {
        lat: this.homeLocation.lat,
        lng: this.homeLocation.lng,
        city: this.homeLocation.city,
        updatedAt: this.homeLocation.updatedAt,
      }
      : { lat: null, lng: null, city: null, updatedAt: null },
    stats: this.privacy.hideStatsFromPublic ? null : this.stats,
    isPrestige: this.isPrestige,
    faction: this.faction,
    factionJoinedAt: this.factionJoinedAt,
    createdAt: this.createdAt,
  };
});

const User = mongoose.model('User', UserSchema);


// ═══════════════════════════════════════════════════════════════════════
// 2. TERRITORIES
// ═══════════════════════════════════════════════════════════════════════

const InvasionLogEntrySchema = new Schema({
  invaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invaderUsername: { type: String },
  invaderColor: { type: String },
  previousOwnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  occurredAt: { type: Date, default: Date.now },
  runId: { type: Schema.Types.ObjectId, ref: 'Run' },
}, { _id: true });

const TerritorySchema = new Schema({
  // H3 identifier
  hexId: { type: String, required: true, unique: true, index: true }, // '8928308280fffff'
  resolution: { type: Number, default: H3_RESOLUTION },

  // Geographic center (for geospatial queries)
  center: { type: GeoPointSchema },
  city: { type: String, default: null, index: true },
  country: { type: String, default: null },

  // Ownership
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerUsername: { type: String, required: true },
  ownerColor: { type: String, required: true },
  ownerHashcode: { type: String },

  // Faction (Global Territory Wars)
  faction: { type: String, enum: ['red', 'blue', 'green'], default: null },
  factionColor: { type: String, default: null }, // '#FF4444', '#4488FF', '#44FF88'

  // Claim history
  firstClaimedAt: { type: Date, default: Date.now },
  claimedAt: { type: Date, default: Date.now, index: true }, // last ownership change
  lastActiveAt: { type: Date, default: Date.now }, // last time owner ran through it

  // Invasion tracking
  totalInvasions: { type: Number, default: 0 },
  invasionLog: { type: [InvasionLogEntrySchema], default: [], select: false }, // excluded from default queries

  // Credit value (for decay calculation)
  creditValue: { type: Number, default: 10 },
  decayFactor: { type: Number, default: 1.0 }, // 0.0–1.0

  // Flags
  isContested: { type: Boolean, default: false }, // invaded 2+ times in last 24h
  isHotspot: { type: Boolean, default: false }, // top 1% invasion count globally

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: true, collection: 'territories_v1' });

// Indexes
TerritorySchema.index({ ownerId: 1, claimedAt: -1 });
TerritorySchema.index({ city: 1, ownerId: 1 });
TerritorySchema.index({ isContested: 1, lastActiveAt: -1 });
TerritorySchema.index({ center: '2dsphere' }); // geospatial

const Territory = mongoose.model('Territory', TerritorySchema);


// ═══════════════════════════════════════════════════════════════════════
// 3. RUNS
// ═══════════════════════════════════════════════════════════════════════

const RunSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String },
  userColor: { type: String },

  // Timing
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },

  // Distance & territory
  distanceKm: { type: Number, default: 0 },
  stepsCount: { type: Number, default: 0 }, // accelerometer & distance-based step count
  hexesClaimed: { type: [String], default: [] }, // new claims (unclaimed before)
  hexesInvaded: { type: [String], default: [] }, // claimed from others
  hexesRetouched: { type: [String], default: [] }, // already owned, refreshed
  hexesTotal: { type: Number, default: 0 },    // total unique hexes touched

  // Credits
  creditsEarned: { type: Number, default: 0 },
  creditsFromClaims: { type: Number, default: 0 },
  creditsFromInvasions: { type: Number, default: 0 },
  peakMultiplierUsed: { type: Number, default: 1.0 },

  // Run metadata
  startLocation: { type: GeoPointSchema },
  endLocation: { type: GeoPointSchema },
  boundingBox: {  // for map replay queries
    minLat: Number, maxLat: Number,
    minLng: Number, maxLng: Number,
  },
  city: { type: String, default: null },
  country: { type: String, default: null },

  // GPS summary (detailed points in gps_points collection)
  gpsPointCount: { type: Number, default: 0 },
  avgAccuracyM: { type: Number, default: 0 },
  maxSpeedKmh: { type: Number, default: 0 },
  avgPaceMinKm: { type: Number, default: 0 },

  // Processed flags
  isProcessed: { type: Boolean, default: false },
  processedAt: { type: Date, default: null },

  // Blockchain
  blockchainProofHash: { type: String, default: null },
  includedInDailyProof: { type: Boolean, default: false },

  // Anti-cheat system (6-layer detection)
  antiCheat: {
    verdict: { type: String, enum: ['clean', 'warned', 'partial', 'disqualified', 'not_checked'], default: 'not_checked' },
    creditMultiplier: { type: Number, default: 1.0, min: 0, max: 1.0 }, // 1.0 clean, 0.75 warned, 0.5 partial, 0 disqualified
    totalWeight: { type: Number, default: 0 },  // cumulative flag score
    flagCount: { type: Number, default: 0 },  // number of distinct flags raised
    checkedAt: { type: Date, default: null },
    // Detection results per layer
    layer1_speed: { type: Boolean, default: false },
    layer2_smoothness: { type: Boolean, default: false },
    layer3_pace: { type: Boolean, default: false },
    layer4_dwell: { type: Boolean, default: false },
    layer5_integrity: { type: Boolean, default: false },
    layer6_farming: { type: Boolean, default: false },
  },

  // Hex validation (after dwell filter)
  validHexes: { type: [String], default: [] }, // hexes that passed 8-second minimum
  failedHexes: { type: [String], default: [] }, // hexes that failed dwell test

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: true, collection: 'runs_v1' });

// Indexes
RunSchema.index({ userId: 1, startedAt: -1 });
RunSchema.index({ city: 1, startedAt: -1 });
RunSchema.index({ isProcessed: 1, isActive: 1 });
RunSchema.index({ startedAt: -1 }); // global timeline
RunSchema.index({ endedAt: -1 }); // for landing page aggregations
RunSchema.index({ endedAt: 1, status: 1 }); // landing page stats queries
RunSchema.index({ 'antiCheat.verdict': 1 }); // filter disqualified for leaderboards
RunSchema.index({ 'antiCheat.checkedAt': 1 });

const Run = mongoose.model('Run', RunSchema);


// ═══════════════════════════════════════════════════════════════════════
// 4. GPS_POINTS  (separate collection — high write volume)
// ═══════════════════════════════════════════════════════════════════════

const GpsPointSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: 'Run', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seq: { type: Number, required: true },   // sequence number within run
  location: { type: GeoPointSchema, required: true },
  accuracy: { type: Number },                   // meters
  altitude: { type: Number, default: null },    // meters
  speed: { type: Number, default: null },    // m/s
  heading: { type: Number, default: null },    // degrees
  hexId: { type: String, default: null },    // computed H3 hex
  recordedAt: { type: Date, required: true },
  isValid: { type: Boolean, default: true },   // false if accuracy > 50m
}, { timestamps: false, collection: 'gps_points_v1' });

// Compound index for fast run replay
GpsPointSchema.index({ runId: 1, seq: 1 });
GpsPointSchema.index({ runId: 1, recordedAt: 1 });
// TTL: auto-delete GPS points after 90 days (retain run summary only)
GpsPointSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 7776000 });

const GpsPoint = mongoose.model('GpsPoint', GpsPointSchema);


// ═══════════════════════════════════════════════════════════════════════
// 5. CREDITS_LEDGER  (immutable audit log — never update, only insert)
// ═══════════════════════════════════════════════════════════════════════

const CreditLedgerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String },

  amount: { type: Number, required: true }, // positive = earned, negative = lost
  balanceAfter: { type: Number, required: true }, // snapshot of balance post-transaction
  type: {
    type: String,
    required: true,
    enum: [
      'run_claim',       // earned by claiming unclaimed hexes
      'run_invasion',    // earned by invading others' hexes
      'run_retouch',     // earned by running over own hexes (smaller bonus)
      'invaded_loss',    // lost when someone invades your hex
      'decay',           // periodic decay of inactive territory
      'achievement',     // bonus credits from achievement unlock
      'admin_adjust',    // manual admin correction
      'prestige_bonus',  // bonus for holding city #1
      'weekly_bonus',    // end-of-week top-player reward
    ],
  },
  refId: { type: Schema.Types.ObjectId, default: null }, // runId or invasionId
  hexIds: { type: [String], default: [] },  // which hexes this entry relates to
  hexCount: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1.0 },   // peak hour multiplier applied
  note: { type: String, default: null },   // human-readable description
  occurredAt: { type: Date, default: Date.now, index: true },
  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: false, collection: 'credits_ledger_v1' });

// Indexes for ledger queries
CreditLedgerSchema.index({ userId: 1, occurredAt: -1 });
CreditLedgerSchema.index({ type: 1, occurredAt: -1 });
CreditLedgerSchema.index({ refId: 1 });

const CreditLedger = mongoose.model('CreditLedger', CreditLedgerSchema);


// ═══════════════════════════════════════════════════════════════════════
// 6. INVASIONS  (event log — powers notifications & rivalry tracking)
// ═══════════════════════════════════════════════════════════════════════

const InvasionSchema = new Schema({
  runId: { type: Schema.Types.ObjectId, ref: 'Run', required: true },

  // Invader (new owner)
  invaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invaderUsername: { type: String },
  invaderColor: { type: String },

  // Victim (previous owner)
  victimId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  victimUsername: { type: String },
  victimColor: { type: String },

  // Hex data
  hexIds: { type: [String], required: true },
  hexCount: { type: Number, required: true },
  hexCity: { type: String, default: null },

  // Credit impact
  creditsGained: { type: Number, required: true }, // invader gains
  creditsLost: { type: Number, required: true },  // victim loses

  // Location
  centroidLocation: { type: GeoPointSchema },

  // State
  victimNotified: { type: Boolean, default: false },
  rivalryUpdated: { type: Boolean, default: false },

  occurredAt: { type: Date, default: Date.now },
  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: false, collection: 'invasions_v1' });

InvasionSchema.index({ invaderId: 1, occurredAt: -1 });
InvasionSchema.index({ victimId: 1, occurredAt: -1 });
InvasionSchema.index({ hexCity: 1, occurredAt: -1 });
InvasionSchema.index({ occurredAt: -1 });

const Invasion = mongoose.model('Invasion', InvasionSchema);


// ═══════════════════════════════════════════════════════════════════════
// 7. LEADERBOARD_CACHE  (pre-computed snapshots, refreshed on schedule)
// ═══════════════════════════════════════════════════════════════════════

const LeaderboardEntrySchema = new Schema({
  rank: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  color: { type: String },
  hashcode: { type: String },
  credits: { type: Number },
  hexesOwned: { type: Number },
  totalKm: { type: Number },
  currentStreak: { type: Number },
  isPrestige: { type: Boolean },
  rankDelta: { type: Number, default: 0 }, // vs previous snapshot
  city: { type: String, default: null },
}, { _id: false });

const LeaderboardCacheSchema = new Schema({
  scope: { type: String, required: true, enum: ['global', 'city', 'weekly_global', 'weekly_city'], index: true },
  city: { type: String, default: null },  // null for global
  period: { type: String, default: null },  // 'YYYY-WW' for weekly
  entries: { type: [LeaderboardEntrySchema], default: [] },
  totalUsers: { type: Number, default: 0 },
  computedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { collection: 'leaderboard_cache_v1' });

LeaderboardCacheSchema.index({ scope: 1, city: 1, period: 1 }, { unique: true });
LeaderboardCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-purge stale

const LeaderboardCache = mongoose.model('LeaderboardCache', LeaderboardCacheSchema);


// ═══════════════════════════════════════════════════════════════════════
// 8. NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  type: { type: String, required: true, enum: NOTIFICATION_TYPES },
  isRead: { type: Boolean, default: false, index: true },
  isDelivered: { type: Boolean, default: false }, // push sent
  isPushed: { type: Boolean, default: false },  // push acknowledged

  // Notification content
  title: { type: String, required: true },
  body: { type: String, required: true },
  iconType: { type: String, default: null },   // emoji or icon key

  // Deep-link data (for tap action)
  actionType: { type: String, default: null },   // 'open_map', 'open_leaderboard', etc.
  actionData: {
    hexIds: { type: [String], default: undefined },
    runId: { type: Schema.Types.ObjectId, default: undefined },
    invasionId: { type: Schema.Types.ObjectId, default: undefined },
    userId: { type: Schema.Types.ObjectId, default: undefined },
    locationLat: { type: Number, default: undefined },
    locationLng: { type: Number, default: undefined },
    leaderboardScope: { type: String, default: undefined },
  },

  // Metadata
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // user who caused it
  creditDelta: { type: Number, default: null }, // credit change if applicable
  hexCount: { type: Number, default: null },
  rankBefore: { type: Number, default: null },
  rankAfter: { type: Number, default: null },

  // Delivery
  scheduledFor: { type: Date, default: null },   // null = send immediately
  sentAt: { type: Date, default: null },

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: true, collection: 'notifications_v1' });

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1, isDelivered: 1 });
// Auto-delete notifications after 60 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const Notification = mongoose.model('Notification', NotificationSchema);


// ═══════════════════════════════════════════════════════════════════════
// 9. CHAT_MESSAGES
// ═══════════════════════════════════════════════════════════════════════

const ChatMessageSchema = new Schema({
  roomId: { type: String, required: true, index: true },
  roomType: { type: String, enum: ['global', 'city', 'dm'], required: true },

  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderUsername: { type: String, required: true },
  senderColor: { type: String, required: true },
  senderHashcode: { type: String },

  content: { type: String, required: true, maxlength: 500, trim: true },
  contentType: { type: String, enum: ['text', 'system', 'achievement_share', 'run_share'], default: 'text' },

  // For run_share content type
  runSummary: {
    runId: { type: Schema.Types.ObjectId, default: undefined },
    kmDistance: { type: Number, default: undefined },
    hexCount: { type: Number, default: undefined },
    credits: { type: Number, default: undefined },
  },

  // Moderation
  flagCount: { type: Number, default: 0 },
  flaggedBy: { type: [Schema.Types.ObjectId], default: [] },
  isHidden: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: Schema.Types.ObjectId, default: null },

  // Threading
  replyToId: { type: Schema.Types.ObjectId, ref: 'ChatMessage', default: null },

  sentAt: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: false, collection: 'chat_messages_v1' });

ChatMessageSchema.index({ roomId: 1, sentAt: -1 });
ChatMessageSchema.index({ senderId: 1, sentAt: -1 });
ChatMessageSchema.index({ flagCount: 1, isHidden: 1 });
// Auto-delete global/city chat after 30 days (DMs kept longer)
ChatMessageSchema.index({ sentAt: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { roomType: { $in: ['global', 'city'] } } });

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);


// ═══════════════════════════════════════════════════════════════════════
// 10. CHAT_ROOMS
// ═══════════════════════════════════════════════════════════════════════

const ChatRoomSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true, enum: ['global', 'city', 'dm'] },
  name: { type: String, default: null },  // 'Hyderabad', 'Global', null for DMs
  city: { type: String, default: null, sparse: true },

  // DM-specific
  members: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  isDm: { type: Boolean, default: false },

  // Stats
  messageCount: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },

  // Moderation
  isMuted: { type: Boolean, default: false },
  mutedUntil: { type: Date, default: null },

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: true, collection: 'chat_rooms_v1' });

ChatRoomSchema.index({ type: 1, city: 1 }, { unique: true, sparse: true });
ChatRoomSchema.index({ members: 1, isDm: 1 });

const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);


// ═══════════════════════════════════════════════════════════════════════
// 11. ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════════════

// Achievement Definitions (seeded on first deploy)
const AchievementDefSchema = new Schema({
  slug: { type: String, required: true, unique: true }, // 'first_100_hexes'
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },  // emoji
  category: { type: String, enum: ['territory', 'runs', 'social', 'credits', 'streak', 'prestige'] },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  creditReward: { type: Number, default: 0 },
  isHidden: { type: Boolean, default: false }, // surprise achievement
  isRepeatable: { type: Boolean, default: false },

  // Condition definition (evaluated server-side)
  condition: {
    metric: { type: String }, // 'totalHexesClaimed', 'currentStreak', etc.
    operator: { type: String, enum: ['gte', 'lte', 'eq'] },
    value: { type: Number },
  },
}, { collection: 'achievement_defs_v1' });

const AchievementDef = mongoose.model('AchievementDef', AchievementDefSchema);

// User achievement earned records
const UserAchievementSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  achievementSlug: { type: String, required: true },
  achievementName: { type: String },
  tier: { type: String },
  creditReward: { type: Number, default: 0 },
  earnedAt: { type: Date, default: Date.now },
  runId: { type: Schema.Types.ObjectId, ref: 'Run', default: null },
  notificationSent: { type: Boolean, default: false },
}, { timestamps: false, collection: 'user_achievements_v1' });

UserAchievementSchema.index({ userId: 1, achievementSlug: 1 });
UserAchievementSchema.index({ earnedAt: -1 });

const UserAchievement = mongoose.model('UserAchievement', UserAchievementSchema);

// Pre-seed achievement definitions
const ACHIEVEMENT_SEEDS = [
  { slug: 'first_run', name: 'Off the Couch', description: 'Complete your first run', icon: '👟', category: 'runs', tier: 'bronze', creditReward: 50, condition: { metric: 'totalRuns', operator: 'gte', value: 1 } },
  { slug: 'first_hex', name: 'Land Grab', description: 'Claim your first hex', icon: '🗺️', category: 'territory', tier: 'bronze', creditReward: 25, condition: { metric: 'totalHexesClaimed', operator: 'gte', value: 1 } },
  { slug: 'hex_100', name: 'Trailblazer', description: 'Claim 100 hexes', icon: '🏔️', category: 'territory', tier: 'bronze', creditReward: 100, condition: { metric: 'totalHexesClaimed', operator: 'gte', value: 100 } },
  { slug: 'hex_500', name: 'District Commander', description: 'Claim 500 hexes', icon: '🏙️', category: 'territory', tier: 'silver', creditReward: 300, condition: { metric: 'totalHexesClaimed', operator: 'gte', value: 500 } },
  { slug: 'hex_2000', name: 'City Warlord', description: 'Claim 2000 hexes', icon: '⚔️', category: 'territory', tier: 'gold', creditReward: 1000, condition: { metric: 'totalHexesClaimed', operator: 'gte', value: 2000 } },
  { slug: 'first_invasion', name: 'Raider', description: 'Invade your first enemy hex', icon: '⚡', category: 'territory', tier: 'bronze', creditReward: 75, condition: { metric: 'totalHexesInvaded', operator: 'gte', value: 1 } },
  { slug: 'invasion_50', name: 'Conqueror', description: 'Invade 50 enemy hexes', icon: '🔥', category: 'territory', tier: 'silver', creditReward: 250, condition: { metric: 'totalHexesInvaded', operator: 'gte', value: 50 } },
  { slug: 'streak_7', name: 'Week Warrior', description: '7-day running streak', icon: '🔥', category: 'streak', tier: 'silver', creditReward: 200, condition: { metric: 'currentStreak', operator: 'gte', value: 7 } },
  { slug: 'streak_30', name: 'Unstoppable', description: '30-day running streak', icon: '💪', category: 'streak', tier: 'gold', creditReward: 1000, condition: { metric: 'currentStreak', operator: 'gte', value: 30 } },
  { slug: 'km_100', name: 'Century Runner', description: 'Run 100km total', icon: '🏃', category: 'runs', tier: 'silver', creditReward: 500, condition: { metric: 'totalKm', operator: 'gte', value: 100 } },
  { slug: 'top10_city', name: 'City Elite', description: 'Reach top 10 in your city', icon: '🏆', category: 'prestige', tier: 'gold', creditReward: 500, condition: { metric: 'cityRank', operator: 'lte', value: 10 } },
  { slug: 'rank1_city', name: 'City Champion', description: 'Reach #1 in your city', icon: '👑', category: 'prestige', tier: 'platinum', creditReward: 2000, isHidden: false, condition: { metric: 'cityRank', operator: 'eq', value: 1 } },
  { slug: 'rival_3', name: 'Known Enemy', description: 'Build a rivalry with 3 players', icon: '🗡️', category: 'social', tier: 'silver', creditReward: 150, condition: { metric: 'rivals', operator: 'gte', value: 3 } },
];


// ═══════════════════════════════════════════════════════════════════════
// 12. DAILY_PROOFS  (blockchain anchoring)
// ═══════════════════════════════════════════════════════════════════════

const DailyProofSchema = new Schema({
  date: { type: String, required: true, unique: true }, // 'YYYY-MM-DD'

  // Summary data included in proof
  totalUsers: { type: Number },
  activeUsers: { type: Number },
  totalHexesClaimed: { type: Number },
  totalRunsCompleted: { type: Number },
  totalKmRun: { type: Number },
  topUserId: { type: String }, // hashed, not raw ObjectId
  topUserCredits: { type: Number },

  // Merkle tree
  merkleRoot: { type: String, required: true },
  leafCount: { type: Number },

  // Blockchain anchoring - Ethereum Sepolia
  txHash: { type: String, default: null },  // Ethereum tx hash
  txStatus: { type: String, default: null }, // confirmed | failed
  explorerUrl: { type: String, default: null }, // etherscan link
  network: { type: String, enum: ['sepolia', 'mainnet'], default: 'sepolia' },
  userCount: { type: Number, default: 0 },
  totalHexes: { type: Number, default: 0 },
  anchoredAt: { type: Date, default: null },
  anchorAttempts: { type: Number, default: 0 },
  anchorError: { type: String, default: null },

  // Status
  status: {
    type: String,
    enum: ['pending', 'computing', 'anchoring', 'confirmed', 'failed'],
    default: 'pending',
    index: true,
  },

  createdAt: { type: Date, default: Date.now },
  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { collection: 'daily_proofs_v1' });

DailyProofSchema.index({ status: 1, date: -1 });

const DailyProof = mongoose.model('DailyProof', DailyProofSchema);


// ═══════════════════════════════════════════════════════════════════════
// 13. REPORTS  (anti-cheat + moderation)
// ═══════════════════════════════════════════════════════════════════════

const ReportSchema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reportedId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  type: {
    type: String,
    required: true,
    enum: ['gps_spoofing', 'bot_run', 'abusive_chat', 'harassment', 'cheating', 'other'],
  },

  description: { type: String, maxlength: 1000, default: '' },
  evidenceRunId: { type: Schema.Types.ObjectId, ref: 'Run', default: null },
  evidenceChatId: { type: Schema.Types.ObjectId, ref: 'ChatMessage', default: null },

  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  resolution: { type: String, default: null },
  resolvedAt: { type: Date, default: null },

  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { timestamps: true, collection: 'reports_v1' });

ReportSchema.index({ reportedId: 1, status: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', ReportSchema);


// ═══════════════════════════════════════════════════════════════════════
// 14. SESSIONS  (refresh token tracking)
// ═══════════════════════════════════════════════════════════════════════

const SessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshToken: { type: String, required: true, unique: true },
  tokenHash: { type: String, required: true }, // SHA-256 hash of refreshToken
  deviceInfo: { type: String, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  isRevoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { collection: 'sessions_v1' });

// Auto-delete expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, isRevoked: 1 });
SessionSchema.index({ tokenHash: 1 }, { unique: true });

const Session = mongoose.model('Session', SessionSchema);


// ═══════════════════════════════════════════════════════════════════════
// 15. RUN_MOMENTS  (ephemeral 24h social posts)
// ═══════════════════════════════════════════════════════════════════════

const RunMomentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },
  userColor: { type: String },
  userHashcode: { type: String },
  userAvatarUrl: { type: String },

  imageUrl: { type: String, required: true }, // Base64 or URL
  caption: { type: String, maxlength: 100 },
  city: { type: String, index: true },

  // Metadata from the run
  runId: { type: Schema.Types.ObjectId, ref: 'Run' },
  stats: {
    distanceKm: Number,
    hexCount: Number,
  },

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { timestamps: false, collection: 'run_moments_v1' });

// TTL index to auto-delete after expiresAt
RunMomentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RunMoment = mongoose.model('RunMoment', RunMomentSchema);


// ═══════════════════════════════════════════════════════════════════════
// 16. CITY_STATS  (aggregate metrics per city — updated by cron)
// ═══════════════════════════════════════════════════════════════════════

const CityStatsSchema = new Schema({
  city: { type: String, required: true, unique: true },
  country: { type: String, default: null },

  // Player counts
  totalPlayers: { type: Number, default: 0 },
  activePlayers24h: { type: Number, default: 0 },
  activePlayers7d: { type: Number, default: 0 },

  // Territory metrics
  totalHexesClaimed: { type: Number, default: 0 },
  totalHexesAvailable: { type: Number, default: 0 }, // estimated for this city area
  coveragePercent: { type: Number, default: 0 },

  // Top players (top 3 for landing page teaser)
  topPlayers: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    color: { type: String },
    credits: { type: Number },
    hexes: { type: Number },
  }],

  // Dominant color (most hexes owned by one color in city)
  dominantColor: { type: String, default: null },
  dominantUser: { type: String, default: null },

  // Activity
  runsToday: { type: Number, default: 0 },
  invasionsToday: { type: Number, default: 0 },
  totalKmToday: { type: Number, default: 0 },

  computedAt: { type: Date, default: Date.now },
  schemaVersion: { type: String, default: SCHEMA_VERSION },
}, { collection: 'city_stats_v1' });

CityStatsSchema.index({ totalPlayers: -1 });

const CityStats = mongoose.model('CityStats', CityStatsSchema);


// ═══════════════════════════════════════════════════════════════════════
// INDEXES SUMMARY (all run as part of db init)
// ═══════════════════════════════════════════════════════════════════════

async function ensureIndexes() {
  await User.ensureIndexes();
  await Territory.ensureIndexes();
  await Run.ensureIndexes();
  await GpsPoint.ensureIndexes();
  await CreditLedger.ensureIndexes();
  await Invasion.ensureIndexes();
  await LeaderboardCache.ensureIndexes();
  await Notification.ensureIndexes();
  await ChatMessage.ensureIndexes();
  await ChatRoom.ensureIndexes();
  await AchievementDef.ensureIndexes();
  await UserAchievement.ensureIndexes();
  await DailyProof.ensureIndexes();
  await Report.ensureIndexes();
  await Session.ensureIndexes();
  await CityStats.ensureIndexes();
  await RunMoment.ensureIndexes();
  console.log('✅ All indexes created');
}


// ═══════════════════════════════════════════════════════════════════════
// SEED DATA (run once on first deploy)
// ═══════════════════════════════════════════════════════════════════════

async function seedAchievements() {
  for (const seed of ACHIEVEMENT_SEEDS) {
    await AchievementDef.updateOne({ slug: seed.slug }, { $set: seed }, { upsert: true });
  }

  // Seed chat rooms (global + placeholder city)
  await ChatRoom.updateOne({ roomId: 'global' }, {
    $set: { roomId: 'global', type: 'global', name: 'Global', city: null }
  }, { upsert: true });

  console.log('✅ Seed data complete');
}


// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  // Models
  User,
  Territory,
  Run,
  GpsPoint,
  CreditLedger,
  Invasion,
  LeaderboardCache,
  Notification,
  ChatMessage,
  ChatRoom,
  AchievementDef,
  UserAchievement,
  DailyProof,
  Report,
  Session,
  CityStats,
  RunMoment,

  // Init functions
  ensureIndexes,
  seedAchievements,

  // Constants
  PLAYER_COLORS,
  NOTIFICATION_TYPES,
  ACHIEVEMENT_SEEDS,
  SCHEMA_VERSION,
  H3_RESOLUTION,
};
