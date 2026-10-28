import { AppEvent, EventType } from '@/types/domain';

/** An event's category for icons and filters; 'other' for anything unrecognised. */
export type EventCategory = EventType | 'other';

/** Text patterns for events written before `type` existed, in the order they are checked. */
const LEGACY_PATTERNS: [RegExp, EventType][] = [
  [/checked in/i, 'checkin'],
  [/checked out/i, 'checkout'],
  [/paused/i, 'pause'],
  [/resumed/i, 'resume'],
  [/uploaded/i, 'upload'],
  [/battery/i, 'battery'],
];

export function eventCategory(event: AppEvent): EventCategory {
  if (event.type) return event.type;
  return LEGACY_PATTERNS.find(([pattern]) => pattern.test(event.text))?.[1] ?? 'other';
}

/** One feed row: an event, and how many identical ones it stands for ("paused sharing ×2"). */
export interface FeedEntry {
  event: AppEvent;
  count: number;
}

/**
 * Collapses repeats in a newest-first list: the same text, back to back, each
 * within `windowMs` of the one before, becomes one entry with a count. The
 * newest copy is kept, so the row shows the latest time.
 */
export function mergeRepeats(events: AppEvent[], windowMs: number): FeedEntry[] {
  const entries: FeedEntry[] = [];
  let lastAt = 0;
  for (const event of events) {
    const previous = entries[entries.length - 1];
    if (previous && previous.event.text === event.text && lastAt - event.at <= windowMs) {
      previous.count += 1;
    } else {
      entries.push({ event, count: 1 });
    }
    lastAt = event.at;
  }
  return entries;
}

export interface EventFilter {
  personId: string | null;
  siteId: string | null;
  category: EventCategory | null;
}

/** null in any field means "any". */
export function filterEvents(events: AppEvent[], filter: EventFilter): AppEvent[] {
  return events.filter(
    event =>
      (!filter.personId || event.personId === filter.personId) &&
      (!filter.siteId || event.siteId === filter.siteId) &&
      (!filter.category || eventCategory(event) === filter.category)
  );
}

/** Where tapping an event goes: an upload to that person's photos, anything else about a person to them. */
export function eventTarget(event: AppEvent): { tab: 'Photos' | 'Crew'; personId: string } | null {
  if (!event.personId) return null;
  return { tab: eventCategory(event) === 'upload' ? 'Photos' : 'Crew', personId: event.personId };
}
