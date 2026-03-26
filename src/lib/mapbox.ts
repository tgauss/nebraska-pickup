/**
 * Mapbox integration — drive times, geocoding, and map utilities
 */

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoidGdhdXNzIiwiYSI6ImUxelFyZWsifQ.ewANL0BvfdZa9RRcOIQSVA';

// Roca warehouse coordinates
export const WAREHOUSE = {
  lng: -96.6197,
  lat: 40.6753,
  address: '2410 Production Drive, Unit 4, Roca, NE 68430',
};

export interface DriveTimeResult {
  duration_minutes: number;
  distance_miles: number;
  route_geometry?: GeoJSON.Geometry;
}

/**
 * Get driving time from a location to the Roca warehouse using Mapbox Directions API
 */
export async function getDriveTime(
  fromLng: number,
  fromLat: number
): Promise<DriveTimeResult | null> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${WAREHOUSE.lng},${WAREHOUSE.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    return {
      duration_minutes: Math.round(route.duration / 60),
      distance_miles: Math.round(route.distance / 1609.34 * 10) / 10,
      route_geometry: route.geometry,
    };
  } catch {
    return null;
  }
}

/**
 * Geocode an address to coordinates using Mapbox Geocoding API
 */
export async function geocodeAddress(
  city: string,
  state: string
): Promise<{ lng: number; lat: number } | null> {
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return null;
    const [lng, lat] = data.features[0].center;
    return { lng, lat };
  } catch {
    return null;
  }
}
