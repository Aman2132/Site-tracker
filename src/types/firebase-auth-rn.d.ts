/**
 * firebase/auth's shipped typings point at its browser entry point, which
 * doesn't include getReactNativePersistence — even though the package
 * resolves a React-Native-specific build (with this export) at runtime via
 * Metro's "react-native" package.json field. Known upstream typings gap;
 * this augments the module with just the one export firebaseClient.ts needs.
 */
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
