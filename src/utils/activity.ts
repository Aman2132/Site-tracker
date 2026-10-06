import { ACTIVITY_RECOGNITION, ACTIVITY_THRESHOLDS } from '@/constants/config';
import { ActivityKind, RecognizedActivity } from '@/types/domain';

/** Rough activity from GPS speed alone — the fallback when the OS has nothing better. */
export function activityFromSpeed(speedMetersPerSecond: number | null | undefined): ActivityKind {
  if (speedMetersPerSecond == null) return 'still';
  if (speedMetersPerSecond > ACTIVITY_THRESHOLDS.vehicleSpeedMps) return 'vehicle';
  if (speedMetersPerSecond > ACTIVITY_THRESHOLDS.walkSpeedMps) return 'walk';
  return 'still';
}

/**
 * The OS recognizer's reading when it's recent and confident — it uses the
 * accelerometer, so it can tell a slow drive in traffic from a walk, which
 * speed alone can't — otherwise GPS speed.
 */
export function resolveActivity(
  recognized: RecognizedActivity | null,
  speedMetersPerSecond: number | null | undefined,
  now: number
): ActivityKind {
  if (
    recognized &&
    recognized.confidence >= ACTIVITY_RECOGNITION.minConfidence &&
    now - recognized.at <= ACTIVITY_RECOGNITION.maxAgeMs
  ) {
    return recognized.kind;
  }
  return activityFromSpeed(speedMetersPerSecond);
}
