import { useEffect } from 'react';

import { subscribeToEvents } from '@/api/eventsApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_EVENTS } from '@/constants/mockData';
import { useEventStore } from '@/store/useEventStore';

let eventsSubscriptionWired = false;

function wireEventsSubscriptionOnce(
  setEvents: (events: ReturnType<typeof useEventStore.getState>['events']) => void
) {
  if (eventsSubscriptionWired) return;
  eventsSubscriptionWired = true;
  if (!HAS_FIREBASE_CONFIG) {
    setEvents(SEED_EVENTS);
    return;
  }
  subscribeToEvents(setEvents);
}

/** Owner Activity screen: arrivals, departures, low battery, uploads — live. */
export function useActivityFeedController() {
  const events = useEventStore(state => state.events);
  const loaded = useEventStore(state => state.loaded);
  const setEvents = useEventStore(state => state.setEvents);

  useEffect(() => {
    wireEventsSubscriptionOnce(setEvents);
  }, [setEvents]);

  return { events, loaded };
}
