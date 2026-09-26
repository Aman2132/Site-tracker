import * as Battery from 'expo-battery';

/**
 * The phone's battery level, 0–1, or undefined when the OS can't say
 * (emulators and some devices report -1). Never rejects.
 */
export async function readBatteryLevel(): Promise<number | undefined> {
  const level = await Battery.getBatteryLevelAsync().catch(() => -1);
  return level >= 0 ? level : undefined;
}
