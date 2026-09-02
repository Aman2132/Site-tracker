import { withNetworkDelay } from './mockNetwork';

import { SEED_EVENTS } from '@/constants/mockData';
import { AppEvent } from '@/types/domain';

export async function fetchEvents(): Promise<AppEvent[]> {
  return withNetworkDelay(SEED_EVENTS.map(e => ({ ...e })));
}
