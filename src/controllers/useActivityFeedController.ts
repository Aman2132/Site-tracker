import { useEffect } from 'react';

import { fetchEvents } from '@/api/eventsApi';
import { useEventStore } from '@/store/useEventStore';

/** Owner Activity screen: arrivals, departures, low battery, uploads. */
export function useActivityFeedController() {
  const events = useEventStore(state => state.events);
  const loaded = useEventStore(state => state.loaded);
  const setEvents = useEventStore(state => state.setEvents);

  useEffect(() => {
    if (!loaded) fetchEvents().then(setEvents);
  }, [loaded, setEvents]);

  return { events, loaded };
}
