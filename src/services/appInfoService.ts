import Constants from 'expo-constants';

/** The version from app.config.ts, e.g. "1.0.0". */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? '—';
}
