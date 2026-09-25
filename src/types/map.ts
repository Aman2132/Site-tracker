import { GeoPoint } from './domain';

/**
 * Base map looks the owner can cycle through. Google only draws 3D buildings
 * on 'standard' — satellite imagery is flat photography.
 */
export const MAP_STYLES = ['standard', 'hybrid', 'satellite', 'terrain'] as const;
export type MapStyle = (typeof MAP_STYLES)[number];

/** Where the live map's camera starts. */
export interface MapCameraPosition {
  center: GeoPoint;
  zoom: number;
  pitch: number;
  heading: number;
}

/**
 * One camera move for the map to perform. `id` changes on every command so
 * the map applies it exactly once. Fields left out keep their current value —
 * e.g. a compass turn changes only `heading`, never yanking the map back to
 * the site after the owner has panned away.
 */
export interface MapCameraCommand extends Partial<MapCameraPosition> {
  id: number;
  durationMs: number;
}
