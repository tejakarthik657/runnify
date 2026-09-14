export type RouteProfile = 'driving' | 'walking' | 'cycling';

export interface RouteManeuver {
  instruction: string;
  type: string;
  distanceMeters: number;
}

export interface RouteResponse {
  profile: RouteProfile;
  distanceKm: number;
  durationMins: number;
  geometry: [number, number][]; // LatLng array for Leaflet Polyline
  maneuvers: RouteManeuver[];
}

/**
 * Calculates a real routing path between two coordinates using OSRM public API
 */
export async function calculateRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  profile: RouteProfile = 'driving'
): Promise<RouteResponse | null> {
  try {
    const osrmProfileMap: Record<RouteProfile, string> = {
      driving: 'driving',
      walking: 'foot',
      cycling: 'bike',
    };

    const osrmProfile = osrmProfileMap[profile];
    const coordinates = `${startLng},${startLat};${destLng},${destLat}`;
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM Routing service unavailable');
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return null;

    const mainRoute = data.routes[0];
    const distanceKm = parseFloat((mainRoute.distance / 1000).toFixed(2));
    const durationMins = Math.round(mainRoute.duration / 60);

    // OSRM GeoJSON geometry format is [lng, lat], convert to Leaflet [lat, lng]
    const geometry: [number, number][] = mainRoute.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const maneuvers: RouteManeuver[] = [];
    if (mainRoute.legs && mainRoute.legs[0]?.steps) {
      mainRoute.legs[0].steps.forEach((step: any) => {
        if (step.maneuver) {
          const type = step.maneuver.type;
          const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
          const name = step.name ? ` onto ${step.name}` : '';
          maneuvers.push({
            instruction: `${type.toUpperCase()}${modifier}${name}`,
            type: step.maneuver.type,
            distanceMeters: Math.round(step.distance),
          });
        }
      });
    }

    return {
      profile,
      distanceKm,
      durationMins,
      geometry,
      maneuvers,
    };
  } catch (err) {
    console.error('[Routing] OSRM Route calculation failed:', err);
    return null;
  }
}
