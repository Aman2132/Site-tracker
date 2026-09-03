import { GeoPoint } from '@/types/domain';

const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Equirectangular approximation — accurate enough at site scale (tens to
 * low-hundreds of meters) and far cheaper than a full haversine.
 */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = (b.lat - a.lat) * METERS_PER_DEGREE_LAT;
  const dLng = (b.lng - a.lng) * METERS_PER_DEGREE_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export function isWithinRadius(point: GeoPoint, center: GeoPoint, radiusMeters: number): boolean {
  return distanceMeters(point, center) < radiusMeters;
}

/**
 * East/north offset of `point` from `center`, in meters. Used to lay crew
 * members out on the static map placeholder without a real map projection.
 */
export function offsetMeters(point: GeoPoint, center: GeoPoint): { east: number; north: number } {
  const east = (point.lng - center.lng) * METERS_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  const north = (point.lat - center.lat) * METERS_PER_DEGREE_LAT;
  return { east, north };
}

/**
 * Approximates a geographic circle as a GeoJSON polygon (Mapbox has no
 * built-in geo-radius circle layer, unlike react-native-maps' <Circle>).
 * Same equirectangular approximation as distanceMeters, inverted.
 */
export function geoCirclePolygon(
  center: GeoPoint,
  radiusMeters: number,
  points = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const dLng = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos(latRad));

  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    ring.push([center.lng + dLng * Math.cos(angle), center.lat + dLat * Math.sin(angle)]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}
