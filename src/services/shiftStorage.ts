import AsyncStorage from '@react-native-async-storage/async-storage';

import { ActiveShift } from '@/types/domain';

/**
 * Keeps the person's current check-in on the phone so it survives an app
 * restart: without it a restart mid-shift would forget the open session and
 * the check-out would have nothing to close. One key per person, like the
 * photo queue, so a shared handset never mixes shifts.
 */

const keyFor = (personId: string) => `shift:${personId}`;

/** Never rejects: a storage failure or corrupt value reads as "not checked in". */
export async function loadShift(personId: string): Promise<ActiveShift | null> {
  const raw = await AsyncStorage.getItem(keyFor(personId)).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveShift>;
    return typeof parsed.siteId === 'string' && typeof parsed.checkedInAt === 'number'
      ? (parsed as ActiveShift)
      : null;
  } catch {
    return null;
  }
}

/** Saves the shift, or clears it when null. Never rejects. */
export async function saveShift(personId: string, shift: ActiveShift | null): Promise<void> {
  const write = shift
    ? AsyncStorage.setItem(keyFor(personId), JSON.stringify(shift))
    : AsyncStorage.removeItem(keyFor(personId));
  await write.catch(error => console.warn('[shift] storage write failed —', error));
}
