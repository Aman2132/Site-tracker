import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { AppEvent, EventKind } from '@/types/domain';

const EVENTS_COLLECTION = 'events';
const MAX_EVENTS = 100;

/** Live activity feed for the owner's Activity screen — newest first. */
export function subscribeToEvents(onChange: (events: AppEvent[]) => void): () => void {
  const eventsQuery = query(
    collection(firestore, EVENTS_COLLECTION),
    orderBy('at', 'desc'),
    limit(MAX_EVENTS)
  );
  return onSnapshot(eventsQuery, snapshot => {
    onChange(
      snapshot.docs.map(d => {
        const data = d.data() as { text: string; kind: EventKind; at: { toMillis(): number } | number };
        const at = typeof data.at === 'number' ? data.at : (data.at?.toMillis() ?? Date.now());
        return { id: d.id, text: data.text, kind: data.kind, at };
      })
    );
  });
}

/** Persists a new activity event so it reaches every device watching the feed. */
export async function logEvent(text: string, kind: EventKind): Promise<void> {
  await addDoc(collection(firestore, EVENTS_COLLECTION), { text, kind, at: serverTimestamp() });
}
