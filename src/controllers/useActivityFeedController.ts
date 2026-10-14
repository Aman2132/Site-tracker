import { useEffect, useMemo, useState } from 'react';

import { subscribeToEvents } from '@/api/eventsApi';
import { ACTIVITY_FEED, HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_EVENTS } from '@/constants/mockData';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useSiteNamesController } from '@/controllers/useSiteNamesController';
import { useEventStore } from '@/store/useEventStore';
import { AppEvent } from '@/types/domain';
import { EventCategory, eventTarget, filterEvents, mergeRepeats } from '@/utils/activityFeed';
import { groupByDay } from '@/utils/formatters';

/** Filter value meaning "any" (the chips need a string id). */
export const ANY = '__any__';

const CATEGORY_OPTIONS: { id: EventCategory; label: string }[] = [
  { id: 'checkin', label: 'Check-ins' },
  { id: 'checkout', label: 'Check-outs' },
  { id: 'pause', label: 'Paused' },
  { id: 'resume', label: 'Resumed' },
  { id: 'upload', label: 'Uploads' },
  { id: 'battery', label: 'Low battery' },
  { id: 'other', label: 'Other' },
];

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

/**
 * Owner Activity screen: arrivals, departures, low battery, uploads — live.
 * Filtered by person/site/type, repeats merged ("×2"), grouped under day headers.
 */
export function useActivityFeedController() {
  const events = useEventStore(state => state.events);
  const loaded = useEventStore(state => state.loaded);
  const setEvents = useEventStore(state => state.setEvents);
  // Names for the person filter come from the live roster.
  const { people } = useCrewTrackingController();
  const siteNames = useSiteNamesController(events.map(event => event.siteId));
  const [personId, setPersonId] = useState(ANY);
  const [siteId, setSiteId] = useState(ANY);
  const [category, setCategory] = useState(ANY);

  useEffect(() => {
    wireEventsSubscriptionOnce(setEvents);
  }, [setEvents]);

  const sections = useMemo(() => {
    const visible = filterEvents(events, {
      personId: personId === ANY ? null : personId,
      siteId: siteId === ANY ? null : siteId,
      category: category === ANY ? null : (category as EventCategory),
    });
    return groupByDay(mergeRepeats(visible, ACTIVITY_FEED.mergeWindowMs), entry => entry.event.at);
  }, [events, personId, siteId, category]);

  const nameOf = useMemo(() => new Map(people.map(person => [person.id, person.name])), [people]);
  const personOptions = useMemo(() => {
    const ids = Array.from(new Set(events.map(event => event.personId).filter((id): id is string => !!id)));
    return ids
      .map(id => ({ id, label: nameOf.get(id) ?? 'Unknown person' }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [events, nameOf]);
  const siteOptions = Object.entries(siteNames)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const labelOf = (options: { id: string; label: string }[], id: string, anyLabel: string) =>
    id === ANY ? anyLabel : (options.find(option => option.id === id)?.label ?? anyLabel);

  return {
    loaded,
    hasEvents: events.length > 0,
    sections,
    filters: {
      people: [{ id: ANY, label: 'Everyone' }, ...personOptions],
      sites: [{ id: ANY, label: 'All sites' }, ...siteOptions],
      categories: [{ id: ANY, label: 'All events' }, ...CATEGORY_OPTIONS],
      personId,
      siteId,
      category,
      setPersonId,
      setSiteId,
      setCategory,
    },
    summary: [
      labelOf(CATEGORY_OPTIONS, category, 'All events'),
      labelOf(siteOptions, siteId, 'All sites'),
      labelOf(personOptions, personId, 'Everyone'),
    ].join(' · '),
    activeFilterCount: [personId, siteId, category].filter(value => value !== ANY).length,
    reset: () => {
      setPersonId(ANY);
      setSiteId(ANY);
      setCategory(ANY);
    },
    /** Where tapping this event leads, or null when it is about no one. */
    targetOf: (event: AppEvent) => eventTarget(event),
  };
}
