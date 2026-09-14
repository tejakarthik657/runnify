import { PlacePOI, searchNearbyPOIs } from './places.service';
import api from './api';

export interface AskMapIntent {
  category: string;
  radiusMeters: number;
  minRating: number;
  openNow: boolean;
  sortBy: 'rating' | 'distance';
  followUpIntent?: string;
}

export interface AskMapResponse {
  query: string;
  intent: AskMapIntent;
  places: PlacePOI[];
  aiExplanation: string;
}

/**
 * Extracts structured search intent from natural language using Groq API
 */
export async function extractMapIntent(userQuery: string, previousIntent?: AskMapIntent): Promise<AskMapIntent> {
  const fallbackIntent: AskMapIntent = {
    category: parseCategoryFromQuery(userQuery),
    radiusMeters: parseRadiusFromQuery(userQuery),
    minRating: userQuery.toLowerCase().includes('top') || userQuery.toLowerCase().includes('best') || userQuery.toLowerCase().includes('highly rated') ? 4.2 : 0,
    openNow: userQuery.toLowerCase().includes('open'),
    sortBy: userQuery.toLowerCase().includes('near') || userQuery.toLowerCase().includes('close') ? 'distance' : 'rating',
  };

  try {
    const prompt = `Extract JSON search intent for a mapping application.
User query: "${userQuery}"
Previous intent (if follow-up): ${previousIntent ? JSON.stringify(previousIntent) : 'none'}

Return ONLY a valid JSON object with:
{
  "category": "cafe" | "restaurant" | "park" | "gym" | "fuel" | "hospital" | "bank" | "hotel" | "bar" | "store",
  "radiusMeters": number (default 3000),
  "minRating": number (e.g. 4.0 or 0),
  "openNow": boolean,
  "sortBy": "rating" | "distance"
}`;

    const { data } = await api.post('/bot/ask', {
      question: prompt,
    });

    const jsonMatch = data.answer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || fallbackIntent.category,
        radiusMeters: typeof parsed.radiusMeters === 'number' ? parsed.radiusMeters : fallbackIntent.radiusMeters,
        minRating: typeof parsed.minRating === 'number' ? parsed.minRating : fallbackIntent.minRating,
        openNow: typeof parsed.openNow === 'boolean' ? parsed.openNow : fallbackIntent.openNow,
        sortBy: parsed.sortBy === 'distance' || parsed.sortBy === 'rating' ? parsed.sortBy : fallbackIntent.sortBy,
      };
    }
  } catch (err) {
    console.warn('[AskMap] Groq intent extraction fallback:', err);
  }

  return fallbackIntent;
}

function parseCategoryFromQuery(q: string): string {
  const query = q.toLowerCase();
  if (query.includes('cafe') || query.includes('coffee')) return 'cafe';
  if (query.includes('restaurant') || query.includes('food') || query.includes('eat') || query.includes('dinner') || query.includes('lunch')) return 'restaurant';
  if (query.includes('park') || query.includes('garden')) return 'park';
  if (query.includes('gym') || query.includes('fitness') || query.includes('workout')) return 'gym';
  if (query.includes('fuel') || query.includes('gas') || query.includes('petrol')) return 'fuel';
  if (query.includes('hospital') || query.includes('clinic') || query.includes('doctor')) return 'hospital';
  if (query.includes('hotel') || query.includes('stay')) return 'hotel';
  if (query.includes('bank') || query.includes('atm')) return 'bank';
  if (query.includes('bar') || query.includes('pub')) return 'bar';
  return 'restaurant';
}

function parseRadiusFromQuery(q: string): number {
  const match = q.match(/(\d+)\s*(km|kilometer|kilometers)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10) * 1000;
  }
  const matchMeters = q.match(/(\d+)\s*(m|meter|meters)/i);
  if (matchMeters && matchMeters[1]) {
    return parseInt(matchMeters[1], 10);
  }
  return 3000; // default 3km
}

/**
 * Orchestrates Ask Map search: Intent -> Real POIs -> Ranking -> AI Natural Language Explanation
 */
export async function executeAskMapQuery(
  userQuery: string,
  userLat: number,
  userLng: number,
  previousIntent?: AskMapIntent
): Promise<AskMapResponse> {
  const intent = await extractMapIntent(userQuery, previousIntent);

  // Search real POIs
  let rawPlaces = await searchNearbyPOIs(intent.category, userLat, userLng, intent.radiusMeters);

  // Apply real filters
  if (intent.minRating > 0) {
    rawPlaces = rawPlaces.filter(p => p.rating >= intent.minRating);
  }
  if (intent.openNow) {
    rawPlaces = rawPlaces.filter(p => p.openNow);
  }

  // Apply sorting
  if (intent.sortBy === 'rating') {
    rawPlaces.sort((a, b) => b.rating - a.rating);
  } else {
    rawPlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  const topPlaces = rawPlaces.slice(0, 8);

  // AI explanation synthesis
  let aiExplanation = '';
  if (topPlaces.length === 0) {
    aiExplanation = `I searched within ${(intent.radiusMeters / 1000).toFixed(1)}km of your location but found no ${intent.category}s matching your filters. Try increasing your search radius or clearing open-now filters.`;
  } else {
    const best = topPlaces[0];
    aiExplanation = `Found ${topPlaces.length} real ${intent.category}s near you. The top match is **${best.name}** (${best.rating}★, ${(best.distanceMeters / 1000).toFixed(1)}km away). ${best.openNow ? 'Currently open!' : 'Check opening hours.'}`;
  }

  return {
    query: userQuery,
    intent,
    places: topPlaces,
    aiExplanation,
  };
}
