import { requireOptionalNativeModule } from 'expo';

import { RecognizedActivity } from '@/types/domain';

/**
 * Wraps the local native module in modules/activity-recognition (Android
 * Play Services activity recognition). On iOS, or a build made before the
 * module existed, the module is missing and every call here is a harmless
 * no-op — callers then fall back to GPS speed.
 */

interface PermissionResult {
  granted: boolean;
}

interface ActivityRecognitionNative {
  requestPermissionsAsync(): Promise<PermissionResult>;
  startAsync(intervalMs: number): Promise<boolean>;
  stopAsync(): Promise<void>;
  getLatest(): { kind: string; confidence: number; at: number } | null;
}

const native = requireOptionalNativeModule<ActivityRecognitionNative>('ActivityRecognition');

const KINDS: RecognizedActivity['kind'][] = ['vehicle', 'walk', 'still'];

/** Asks for the "Physical activity" permission. False when unavailable or refused. */
export async function requestActivityRecognitionPermission(): Promise<boolean> {
  if (!native) return false;
  const result = await native.requestPermissionsAsync().catch(() => null);
  return result?.granted ?? false;
}

/** Starts periodic readings. Resolves false without permission or native support. */
export async function startActivityRecognition(intervalMs: number): Promise<boolean> {
  if (!native) return false;
  return native.startAsync(intervalMs).catch(() => false);
}

export async function stopActivityRecognition(): Promise<void> {
  await native?.stopAsync().catch(() => {});
}

/** The most recent reading, or null if there's none (yet). */
export function latestRecognizedActivity(): RecognizedActivity | null {
  const reading = native?.getLatest();
  if (!reading || !KINDS.includes(reading.kind as RecognizedActivity['kind'])) return null;
  return { kind: reading.kind as RecognizedActivity['kind'], confidence: reading.confidence, at: reading.at };
}
