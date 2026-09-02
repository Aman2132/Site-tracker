/**
 * Domain models shared across the app. Screens, controllers, services and
 * the mock api/ layer all speak these shapes — when a real backend is wired
 * in, only src/api/* should need to change.
 */

export type Role = 'owner' | 'worker';

/** Coarse activity signal derived from recent GPS speed. */
export type ActivityKind = 'vehicle' | 'walk' | 'still' | 'stale';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFix extends GeoPoint {
  accuracy: number;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  color: string;
  kind: ActivityKind;
  lat: number;
  lng: number;
  accuracy: number;
  lastFixAt: number;
  battery: number;
  paused: boolean;
}

export interface Site {
  name: string;
  lat: number;
  lng: number;
  /** Geofence radius in meters. */
  radius: number;
}

export interface Photo {
  id: string;
  uri: string;
  lat: number;
  lng: number;
  accuracy: number;
  takenAt: number;
  personId: string;
  task: string;
  synced: boolean;
}

export type EventKind = 'info' | 'warn';

export interface AppEvent {
  id: string;
  at: number;
  text: string;
  kind: EventKind;
}

export interface LocationPermissionState {
  granted: boolean;
  background: boolean;
}
