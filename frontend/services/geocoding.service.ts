export interface GeocodingResult {
  placeId: string;
  displayName: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  category: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Geocodes an address or place query using OpenStreetMap Nominatim API
 */
export async function searchPlaces(query: string, userLat?: number, userLng?: number): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`;
    
    // Prioritize user vicinity if coordinates are available
    if (userLat !== undefined && userLng !== undefined) {
      const viewboxDelta = 0.5; // ~50km box
      const minLng = userLng - viewboxDelta;
      const minLat = userLat - viewboxDelta;
      const maxLng = userLng + viewboxDelta;
      const maxLat = userLat + viewboxDelta;
      url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=0`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'TerritoryRun-App/1.0',
      },
    });

    if (!res.ok) throw new Error('Geocoding service unavailable');
    const data = await res.json();

    return data.map((item: any) => ({
      placeId: item.place_id.toString(),
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || 'location',
      category: item.class || 'place',
      address: {
        road: item.address?.road,
        suburb: item.address?.suburb,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country,
      },
    }));
  } catch (err) {
    console.error('[Geocoding] Search failed:', err);
    return [];
  }
}

/**
 * Reverse geocodes lat/lng into address details
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'TerritoryRun-App/1.0',
      },
    });

    if (!res.ok) return null;
    const item = await res.json();

    return {
      placeId: item.place_id?.toString() || 'custom',
      displayName: item.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      name: item.name || item.address?.road || item.address?.suburb || 'Selected Location',
      lat,
      lng,
      type: item.type || 'coordinate',
      category: item.class || 'place',
      address: {
        road: item.address?.road,
        suburb: item.address?.suburb,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country,
      },
    };
  } catch (err) {
    console.error('[Geocoding] Reverse failed:', err);
    return null;
  }
}
