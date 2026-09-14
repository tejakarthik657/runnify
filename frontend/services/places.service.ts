export interface PlacePOI {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  lat: number;
  lng: number;
  address: string;
  rating: number;
  reviewsCount: number;
  distanceMeters: number;
  openNow: boolean;
  openingHours?: string;
  phone?: string;
  website?: string;
  icon: string;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Generate deterministic pseudo-ratings based on place ID for consistency
function getDeterministicRating(idStr: string): { rating: number; reviews: number } {
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const rating = parseFloat((4.0 + (positiveHash % 10) / 10).toFixed(1)); // 4.0 - 4.9
  const reviews = 45 + (positiveHash % 450);
  return { rating, reviews };
}

/**
 * Searches real places and POIs near a coordinate using Overpass API / Nominatim
 */
export async function searchNearbyPOIs(
  category: string,
  userLat: number,
  userLng: number,
  radiusMeters: number = 3000
): Promise<PlacePOI[]> {
  try {
    // Map user categories to Overpass query tags
    const categoryTagMap: Record<string, string> = {
      cafe: 'amenity=cafe',
      restaurant: 'amenity=restaurant',
      park: 'leisure=park',
      gym: 'leisure=fitness_centre',
      fuel: 'amenity=fuel',
      hospital: 'amenity=hospital',
      bank: 'amenity=bank',
      hotel: 'tourism=hotel',
      bar: 'amenity=pub',
      store: 'shop',
    };

    const tagQuery = categoryTagMap[category.toLowerCase()] || `amenity=${category.toLowerCase()}`;
    const overpassQuery = `[out:json][timeout:15];
(
  node[${tagQuery}](around:${radiusMeters},${userLat},${userLng});
  way[${tagQuery}](around:${radiusMeters},${userLat},${userLng});
);
out center 15;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' },
    });

    if (!res.ok) throw new Error('Overpass API failed');
    const data = await res.json();

    if (!data.elements || data.elements.length === 0) {
      return fallbackNominatimPOISearch(category, userLat, userLng, radiusMeters);
    }

    const places: PlacePOI[] = data.elements
      .map((item: any) => {
        const lat = item.lat || item.center?.lat;
        const lng = item.lon || item.center?.lon;
        if (!lat || !lng) return null;

        const name = item.tags?.name || item.tags?.brand || `${category.toUpperCase()} Place`;
        const dist = haversineMeters(userLat, userLng, lat, lng);
        const { rating, reviews } = getDeterministicRating(item.id.toString());

        return {
          id: item.id.toString(),
          name,
          category: category.toUpperCase(),
          subCategory: item.tags?.cuisine || item.tags?.amenity || category,
          lat,
          lng,
          address: item.tags?.['addr:street'] ? `${item.tags['addr:street']} ${item.tags['addr:housenumber'] || ''}` : `${dist}m from your location`,
          rating,
          reviewsCount: reviews,
          distanceMeters: dist,
          openNow: item.tags?.opening_hours ? !item.tags.opening_hours.includes('off') : true,
          openingHours: item.tags?.opening_hours || 'Open daily 8:00 AM - 10:00 PM',
          phone: item.tags?.phone || item.tags?.['contact:phone'],
          website: item.tags?.website,
          icon: getCategoryIcon(category),
        };
      })
      .filter((p: any) => p !== null);

    return places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } catch (err) {
    console.warn('[Places] Overpass failed, using Nominatim fallback:', err);
    return fallbackNominatimPOISearch(category, userLat, userLng, radiusMeters);
  }
}

async function fallbackNominatimPOISearch(
  category: string,
  userLat: number,
  userLng: number,
  radiusMeters: number
): Promise<PlacePOI[]> {
  try {
    const viewboxDelta = (radiusMeters / 1000) * 0.01;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(category)}&lat=${userLat}&lon=${userLng}&viewbox=${userLng - viewboxDelta},${userLat + viewboxDelta},${userLng + viewboxDelta},${userLat - viewboxDelta}&bounded=0&limit=10&addressdetails=1`;

    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'TerritoryRun-App/1.0' },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const dist = haversineMeters(userLat, userLng, lat, lng);
      const { rating, reviews } = getDeterministicRating(item.place_id.toString());

      return {
        id: item.place_id.toString(),
        name: item.name || item.display_name.split(',')[0],
        category: category.toUpperCase(),
        subCategory: item.type || category,
        lat,
        lng,
        address: item.display_name.split(',').slice(1, 4).join(','),
        rating,
        reviewsCount: reviews,
        distanceMeters: dist,
        openNow: true,
        openingHours: 'Open daily 8:00 AM - 10:00 PM',
        icon: getCategoryIcon(category),
      };
    });
  } catch {
    return [];
  }
}

function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    cafe: '☕',
    restaurant: '🍕',
    park: '🌳',
    gym: '🏋️',
    fuel: '⛽',
    hospital: '🏥',
    bank: '🏦',
    hotel: '🏨',
    bar: '🍺',
    store: '🛍️',
  };
  return map[cat.toLowerCase()] || '📍';
}
