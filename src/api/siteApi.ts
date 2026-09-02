import { withNetworkDelay } from './mockNetwork';

import { SEED_SITE } from '@/constants/mockData';
import { Site } from '@/types/domain';

export async function fetchSite(): Promise<Site> {
  return withNetworkDelay({ ...SEED_SITE });
}

export async function updateGeofenceRadius(_radiusMeters: number): Promise<void> {
  return withNetworkDelay(undefined, 0);
}
