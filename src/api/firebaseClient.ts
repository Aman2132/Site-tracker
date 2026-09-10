import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

import { FIREBASE_CONFIG } from '@/constants/config';

/**
 * Single Firebase app instance + the four SDK clients every api/*.ts file
 * reads from. Firestore holds durable/rarely-changing data (roster, sites,
 * photos, events); Realtime Database holds live crew positions, since its
 * free tier is bandwidth-based rather than per-read, which fits frequent
 * small position writes far better than Firestore's read/write quotas do.
 */
const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);

export const auth: Auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const firestore: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);
