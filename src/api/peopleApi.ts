import { withNetworkDelay } from './mockNetwork';

import { SEED_PEOPLE } from '@/constants/mockData';
import { GeoFix, Person } from '@/types/domain';

/**
 * Crew roster + positions. Backed by static seed data for now — swap the
 * bodies of these two functions for real HTTP/WebSocket calls and nothing
 * outside src/api or src/controllers needs to change.
 */

export async function fetchCrew(): Promise<Person[]> {
  return withNetworkDelay(SEED_PEOPLE.map(p => ({ ...p })));
}

/** Reports the signed-in worker's own position to the backend. */
export async function reportPosition(_personId: string, _fix: GeoFix): Promise<void> {
  return withNetworkDelay(undefined, 0);
}
