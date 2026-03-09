// Frontend API service for Python microservices
// All requests go through Node.js API gateway which proxies to Python services

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Generic Python service caller
async function callPythonService<T>(
  service: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<T> {
  const url = `${API_BASE_URL}/python/${service}/${endpoint}`;
  
  try {
    const response = await axios({
      method,
      url,
      data: method === 'POST' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Python service error (${service}/${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
}

// Direct Node API caller (used for services now implemented in backend Node routes)
async function callNodeApi<T>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await axios({
      method,
      url,
      data: method === 'POST' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(`Node API error (${path}):`, error.response?.data || error.message);
    throw error;
  }
}

// ============================================================
// SERVICE 01: RUN STATISTICS
// ============================================================

export interface RunAnalysisRequest {
  user_id: string;
  time_period?: string; // days, default 30
}

export interface RunStatistics {
  total_runs: number;
  total_distance_km: number;
  total_time_seconds: number;
  avg_distance_km: number;
  avg_pace: string;
  avg_speed_kmh: number;
  total_calories: number;
  best_distance: number;
  longest_run_time: number;
  time_period_days: number;
  runs_per_week: number;
}

export const getRunStatistics = async (userId: string, timePeriod: string = '30') => {
  return callPythonService<RunStatistics>('stats', 'stats/run-analysis', 'POST', {
    user_id: userId,
    time_period: timePeriod,
  });
};

export const getPersonalRecords = async (userId: string, runId?: string) => {
  return callPythonService('stats', 'stats/personal-records', 'POST', {
    user_id: userId,
    run_id: runId,
  });
};

export const getWeeklySummary = async (userId: string) => {
  return callPythonService('stats', `stats/summary/${userId}`, 'GET', { period: 'week' });
};

// ============================================================
// SERVICE 02: HEX TERRITORY ANALYZER
// ============================================================

export interface TerritoryAnalysis {
  total_hexes: number;
  fragmentation_score: number;
  cluster_count: number;
  largest_cluster: number;
  clusters: string[][];
}

export const analyzeTerritoryService = async (userId: string) => {
  return callNodeApi<TerritoryAnalysis>('/territory-analysis/analyze', 'POST', {
    user_id: userId,
  });
};

export const getExpansionSuggestions = async (
  userId: string,
  currentLocation: { lat: number; lng: number },
  maxSuggestions: number = 5
) => {
  return callNodeApi('/territory-analysis/expansion-path', 'POST', {
    user_id: userId,
    // Backend expects start_hex; caller may pass hex in currentLocation.hex in future.
    // For now this keeps API shape backward-compatible with the existing frontend call site.
    start_hex: (currentLocation as any)?.hex_id || (currentLocation as any)?.hex || undefined,
    max_distance: maxSuggestions,
  });
};

export const detectHexClusters = async (userId: string) => {
  return callNodeApi('/territory-analysis/vulnerability', 'POST', {
    user_id: userId,
    threshold: 0.4,
  });
};

// ============================================================
// SERVICE 07: ELEVATION ANALYZER (Node route)
// ============================================================

export const analyzeRunElevation = async (runId: string, userId?: string) => {
  return callNodeApi('/elevation/analyze-run', 'POST', {
    run_id: runId,
    user_id: userId,
  });
};

export const getElevationUserStats = async (userId: string, days: number = 30) => {
  return callNodeApi('/elevation/user-stats', 'POST', {
    user_id: userId,
    days,
  });
};

export const analyzeElevationTrace = async (gpsTrace: Array<{ lat: number; lng: number; elevation?: number }>) => {
  return callNodeApi('/elevation/trace-analysis', 'POST', {
    gps_trace: gpsTrace,
  });
};

// ============================================================
// SERVICE 08: HEATMAP GENERATOR (Node route)
// ============================================================

export const getUserActivityHeatmap = async (userId: string, days: number = 30) => {
  return callNodeApi('/heatmap/user-activity', 'POST', {
    user_id: userId,
    days,
  });
};

export const getAreaActivityHeatmap = async (
  bounds: { north: number; south: number; east: number; west: number },
  days: number = 7
) => {
  return callNodeApi('/heatmap/area-activity', 'POST', {
    bounds,
    days,
  });
};

export const getHeatmapIntensityMatrix = async (userId: string, gridSize: number = 20) => {
  return callNodeApi('/heatmap/intensity-matrix', 'POST', {
    user_id: userId,
    grid_size: gridSize,
  });
};

// ============================================================
// SERVICE 03: ENGAGEMENT SCORE ENGINE
// ============================================================

export interface EngagementScore {
  score: number; // 0-100
  level: string; // Elite, Active, Moderate, Casual, At Risk
  components: {
    frequency: number;
    distance: number;
    recency: number;
    consistency: number;
  };
  days_since_last_run: number;
  runs_this_month: number;
}

export const getEngagementScore = async (userId: string) => {
  return callPythonService<EngagementScore>('engagement', 'engagement/calculate-score', 'POST', {
    user_id: userId,
  });
};

export const getChurnRisk = async (userId: string) => {
  return callPythonService('engagement', 'engagement/churn-risk', 'POST', {
    user_id: userId,
  });
};

export const getActivityPatterns = async (userId: string, days: number = 30) => {
  return callPythonService('engagement', 'engagement/pattern-analysis', 'POST', {
    user_id: userId,
    days,
  });
};

// ============================================================
// SERVICE 04: LEADERBOARD PREDICTOR
// ============================================================

export const predictLeaderboardRank = async (userId: string, horizonDays: number = 7) => {
  return callPythonService('leaderboard', 'leaderboard/predict-rank', 'POST', {
    user_id: userId,
    horizon_days: horizonDays,
  });
};

export const getRivalAnalysis = async (userId: string) => {
  return callPythonService('leaderboard', 'leaderboard/rival-analysis', 'POST', {
    user_id: userId,
  });
};

export const getPointsToNextRank = async (userId: string) => {
  return callPythonService('leaderboard', 'leaderboard/points-to-next', 'POST', {
    user_id: userId,
  });
};

// ============================================================
// SERVICE 06: ROUTE OPTIMIZER
// ============================================================

export const optimizeRunRoute = async (
  userId: string,
  startLat: number,
  startLng: number,
  maxDistanceKm: number = 8,
  maxWaypoints: number = 8
) => {
  return callPythonService('routes', 'routes/optimize', 'POST', {
    user_id: userId,
    start_lat: startLat,
    start_lng: startLng,
    max_distance_km: maxDistanceKm,
    max_waypoints: maxWaypoints,
  });
};

export const estimateRouteYield = async (
  userId: string,
  startLat: number,
  startLng: number,
  radiusRings: number = 5
) => {
  return callPythonService('routes', 'routes/estimate-yield', 'POST', {
    user_id: userId,
    start_lat: startLat,
    start_lng: startLng,
    radius_rings: radiusRings,
  });
};

export const getSafeZones = async (userId: string, startLat: number, startLng: number) => {
  return callPythonService('routes', 'routes/safe-zones', 'POST', {
    user_id: userId,
    start_lat: startLat,
    start_lng: startLng,
  });
};

// ============================================================
// SERVICE 11: BADGE GENERATOR
// ============================================================

export const generateAchievementBadge = async (
  userName: string,
  achievementType: string,
  achievementValue: string,
  colorScheme: string = 'green'
) => {
  return callPythonService('badges', 'badges/achievement', 'POST', {
    user_name: userName,
    achievement_type: achievementType,
    achievement_value: achievementValue,
    color_scheme: colorScheme,
  });
};

export const getAchievementBadgeImage = (
  userName: string,
  achievementType: string,
  achievementValue: string,
  colorScheme: string = 'green'
) => {
  const params = new URLSearchParams({
    user_name: userName,
    achievement_type: achievementType,
    achievement_value: achievementValue,
    color_scheme: colorScheme,
  });
  return `${API_BASE_URL}/python/badges/badges/achievement-image?${params.toString()}`;
};

export const generateQRCode = async (data: string, size: number = 300) => {
  return callPythonService('badges', 'badges/qr-code', 'POST', {
    data,
    size,
    border: 2,
  });
};

// ============================================================
// SERVICE 16: CHALLENGE RECOMMENDER
// ============================================================

export const getChallengeRecommendations = async (userId: string, challengeCount: number = 3) => {
  return callPythonService('challenges', 'challenges/recommend', 'POST', {
    user_id: userId,
    challenge_count: challengeCount,
  });
};

export const getDailyChallenge = async (userId: string) => {
  return callPythonService('challenges', 'challenges/daily', 'POST', {
    user_id: userId,
  });
};

export const getChallengeProgression = async (userId: string) => {
  return callPythonService('challenges', 'challenges/progression', 'POST', {
    user_id: userId,
  });
};

// ============================================================
// SERVICE 17: RUN NAME GENERATOR
// ============================================================

export interface RunNameRequest {
  user_name?: string;
  distance_km?: number;
  location?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening';
  mood?: 'epic' | 'funny' | 'motivational' | 'chill' | 'random';
}

export const generateRunNames = async (request: RunNameRequest) => {
  return callPythonService('names', 'names/generate', 'POST', request);
};

// ============================================================
// SERVICE 18: STREAK CALCULATOR
// ============================================================

export interface StreakData {
  current_streak: number;
  streak_start_date: string | null;
  days_active: number;
  status: string;
  last_run_date?: string;
  days_since_last_run?: number;
}

export const calculateStreak = async (userId: string) => {
  return callPythonService<StreakData>('streak', 'streak/calculate', 'POST', {
    user_id: userId,
  });
};

export const predictNextMilestone = async (currentStreak: number) => {
  return callPythonService('streak', 'streak/predict-milestone', 'POST', {
    current_streak: currentStreak,
  });
};

export const getStreakHistory = async (userId: string, days: number = 90) => {
  return callPythonService('streak', 'streak/history', 'POST', {
    user_id: userId,
    days,
  });
};

// ============================================================
// SERVICE 19: CREDIT OPTIMIZER
// ============================================================

export const optimizeCreditRoute = async (
  userId: string,
  startLocation: { lat: number; lng: number },
  targetDistanceKm: number,
  currentHour?: number
) => {
  return callPythonService('credits', 'credits/optimize-route', 'POST', {
    user_id: userId,
    start_location: startLocation,
    target_distance_km: targetDistanceKm,
    current_hour: currentHour,
  });
};

export const getHighValueHexes = async (
  userId: string,
  currentLocation: { lat: number; lng: number },
  maxDistanceKm: number = 5.0
) => {
  return callPythonService('credits', 'credits/high-value-hexes', 'POST', {
    user_id: userId,
    current_location: currentLocation,
    max_distance_km: maxDistanceKm,
  });
};

export const trackCreditGoal = async (
  userId: string,
  goalCredits: number,
  timeframeDays: number = 30
) => {
  return callPythonService('credits', 'credits/goal-tracking', 'POST', {
    user_id: userId,
    goal_credits: goalCredits,
    timeframe_days: timeframeDays,
  });
};
