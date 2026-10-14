import AsyncStorage from '@react-native-async-storage/async-storage';

/** The Camera screen's "what are you shooting" label and the few used before it. */
export interface CaptureTasks {
  task: string;
  recent: string[];
}

const KEY = 'captureTasks';

/** Never rejects: a storage failure or corrupt value reads as nothing saved. */
export async function loadCaptureTasks(): Promise<CaptureTasks | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CaptureTasks>;
    return typeof parsed.task === 'string' && Array.isArray(parsed.recent)
      ? { task: parsed.task, recent: parsed.recent.filter(item => typeof item === 'string') }
      : null;
  } catch {
    return null;
  }
}

/** Never rejects. */
export async function saveCaptureTasks(tasks: CaptureTasks): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(tasks)).catch(error =>
    console.warn('[storage] capture task write failed —', error)
  );
}
