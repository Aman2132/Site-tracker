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
