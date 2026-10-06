import { ACTIVITY_RECOGNITION } from '@/constants/config';
import { startActivityRecognition, stopActivityRecognition } from '@/services/activityRecognitionService';
import { startBackgroundTracking, stopBackgroundTracking } from '@/services/locationService';

/** Location sharing on: the background tracking task plus Android activity recognition. */
export async function startSharing(): Promise<void> {
  await startBackgroundTracking();
  await startActivityRecognition(ACTIVITY_RECOGNITION.updateIntervalMs);
}

export async function stopSharing(): Promise<void> {
  await stopBackgroundTracking();
  await stopActivityRecognition();
}
