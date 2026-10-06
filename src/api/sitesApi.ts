import { collection, documentId, getDocs, query, where } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { Site } from '@/types/domain';

/** Firestore caps an `in` query at this many ids. */
const IN_QUERY_LIMIT = 30;

/**
 * The sites a person is assigned to, for the check-in picker. Sites are
 * created and assigned from the admin dashboard; the app only reads them.
 * Ids that no longer exist (a deleted site) are simply missing from the result.
 */
export async function fetchSitesByIds(siteIds: string[]): Promise<Site[]> {
  const ids = siteIds.slice(0, IN_QUERY_LIMIT);
  if (ids.length === 0) return [];
  const snapshot = await getDocs(query(collection(firestore, 'sites'), where(documentId(), 'in', ids)));
  return snapshot.docs
    .map(d => {
      const data = d.data() as { name?: string; code?: string };
      return { id: d.id, name: data.name ?? 'Unnamed site', ...(data.code ? { code: data.code } : {}) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
