import { useEffect } from 'react';

import { subscribeToEvents } from '@/api/eventsApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_EVENTS } from '@/constants/mockData';
import { useEventStore } from '@/store/useEventStore';

let eventsSubscriptionWired = false;
let unsubscribeEvents: (() => void) | null = null;

function wireEventsSubscriptionOnce(
  setEvents: (events: ReturnType<typeof useEventStore.getState>['events']) => void
) {
  if (eventsSubscriptionWired) return;
  eventsSubscriptionWired = true;
  if (!HAS_FIREBASE_CONFIG) {
    setEvents(SEED_EVENTS);
    return;
  }
  unsubscribeEvents = subscribeToEvents(setEvents, error => {
    // Ended by the server — let the next Activity screen mount re-subscribe.
    console.warn('[events] live feed stopped —', error.message);
    unsubscribeEvents = null;
    eventsSubscriptionWired = false;
  });
}

/** Closes the live feed before sign-out; see stopCrewSubscription. */
export function stopEventsSubscription(): void {
  unsubscribeEvents?.();
  unsubscribeEvents = null;
  eventsSubscriptionWired = false;
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
