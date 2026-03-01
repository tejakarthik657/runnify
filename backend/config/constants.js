/**
 * Application Constants
 * Configuration values for Territory Run
 */

module.exports = {
  // H3 Hexagon Configuration
  H3_RESOLUTION: 9, // ~174m edge length (suitable for running)
  
  // Credit System
  CREDITS_PER_METER: 1,
  CREDITS_PER_HEX: 100,
  
  // Bonus multipliers
  CONSECUTIVE_HEX_BONUS: 1.1, // 10% bonus for adjacent hexes
  SPEED_BONUS_THRESHOLD: 2.5, // m/s (9 km/h)
  SPEED_BONUS_MULTIPLIER: 1.2, // 20% bonus
  
  // Decay rates
  DAILY_DECAY_RATE: 0.02, // 2% per day
  WEEKLY_DECAY_RATE: 0.10, // 10% per week
  
  // GPS Validation
  MIN_GPS_ACCURACY: 20, // meters
  MAX_GPS_SPEED: 15, // m/s (~54 km/h) to prevent cheating
  MIN_GPS_INTERVAL: 1000, // ms between points
  
  // Run Limits
  MAX_RUN_DURATION: 4 * 60 * 60 * 1000, // 4 hours
  MIN_RUN_DISTANCE: 50, // meters
  
  // Leaderboard
  LEADERBOARD_TOP_N: 100,
  LEADERBOARD_CACHE_TTL: 300, // 5 minutes in seconds
  
  // Rate Limits
  GPS_UPDATES_PER_MINUTE: 360, // 6 per second
  API_REQUESTS_PER_HOUR: 1000,
  
  // Colors (8 available)
  AVAILABLE_COLORS: [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
  ],
  
  // Radius for territory queries (in meters)
  TERRITORY_QUERY_RADIUS: 5000, // 5km
  
  // Blockchain
  DAILY_PROOF_TIME: '00:00', // UTC
  MERKLE_TREE_MAX_LEAVES: 10000,
  
  // Chat
  MAX_MESSAGE_LENGTH: 500,
  CHAT_HISTORY_LIMIT: 100,
  
  // RAG Bot
  RAG_CONTEXT_CHUNKS: 5,
  RAG_MAX_TOKENS: 1000,
  RAG_TEMPERATURE: 0.7,
};
