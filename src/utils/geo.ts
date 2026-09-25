import { OpenLocationCode } from 'open-location-code';

import { GeoPoint } from '@/types/domain';

const METERS_PER_DEGREE_LAT = 111_320;
const olc = new OpenLocationCode();

/**
 * Short, shareable "pin" for a coordinate (e.g. "7JJVXR9R+2X") — a free,
 * offline alternative to a long decimal lat/lng, handy for remote sites with
 * no street address. See https://plus.codes.
 */
export function plusCodeFor(point: GeoPoint): string {
  return olc.encode(point.lat, point.lng);
}

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
 * Compass bearing from `from` to `to`, in degrees clockwise from north
 * (0 = north, 90 = east). Same flat-earth approximation as distanceMeters —
 * plenty for the few metres between two consecutive crew positions.
 */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const { east, north } = offsetMeters(to, from);
  const degrees = (Math.atan2(east, north) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * Adds a position to a movement trail. Points within `minStepMeters` of the
 * previous one are GPS jitter, not movement, and are dropped; the trail keeps
 * only the newest `maxLength` points. Returns the same array when nothing
 * changed, so a store update can be skipped.
 */
export function appendTrailPoint(
  trail: GeoPoint[],
  point: GeoPoint,
  maxLength: number,
  minStepMeters: number
): GeoPoint[] {
  const last = trail[trail.length - 1];
  if (last && distanceMeters(last, point) < minStepMeters) return trail;
  const next = [...trail, { lat: point.lat, lng: point.lng }];
  return next.length > maxLength ? next.slice(next.length - maxLength) : next;
}

/**
 * Next trails for a whole crew snapshot: extends each person's trail with
 * their current position and forgets people no longer in the roster.
 * Returns the same object when nothing changed.
 */
export function nextTrails(
  trails: Record<string, GeoPoint[]>,
  people: { id: string; lat: number; lng: number }[],
  maxLength: number,
  minStepMeters: number
): Record<string, GeoPoint[]> {
  let changed = Object.keys(trails).length !== people.length;
  const next: Record<string, GeoPoint[]> = {};
  for (const person of people) {
    const previous = trails[person.id];
    const updated = appendTrailPoint(previous ?? [], person, maxLength, minStepMeters);
    if (updated !== previous) changed = true;
    next[person.id] = updated;
  }
  return changed ? next : trails;
}
