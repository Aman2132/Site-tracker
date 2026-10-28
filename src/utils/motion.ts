/** Wraps any angle into 0-360. */
export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Shortest signed turn from `from` to `to`, in -180..180 — so 350 -> 10 is +20, not -340. */
export function angleDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}

/**
 * Exponential smoothing for a compass heading. Goes the short way round, so a
 * reading that crosses north (359 -> 1) does not spin the map all the way back.
 */
export function smoothAngle(previous: number | null, sample: number, alpha: number): number {
  if (previous == null) return normalizeDegrees(sample);
  return normalizeDegrees(previous + alpha * angleDelta(previous, sample));
}

/** Plain exponential smoothing for a non-circular value such as tilt. */
export function smoothValue(previous: number | null, sample: number, alpha: number): number {
  if (previous == null) return sample;
  return previous + alpha * (sample - previous);
}

/**
 * Map camera pitch from how the phone is held. `betaRadians` is the
 * front-to-back tilt DeviceMotion reports: 0 lying flat, PI/2 held upright.
 * Flat on a table gives a top-down map; raised to eye level gives full 3D
 * tilt, like looking out across the site.
 */
export function pitchFromTilt(betaRadians: number, minPitch: number, maxPitch: number): number {
  const upright = Math.min(Math.max(Math.abs(betaRadians) / (Math.PI / 2), 0), 1);
  return minPitch + upright * (maxPitch - minPitch);
}
