import { collection, documentId, getDocs, query, where } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { Site } from '@/types/domain';

/** Firestore caps an `in` query at this many ids. */
const IN_QUERY_LIMIT = 30;

/**
 * Sites by id: a person's assigned sites (check-in picker) or the sites that
 * appear in a photo list (to name the filter chips). Sites are created and
 * assigned from the admin dashboard; the app only reads them. Ids that no
 * longer exist (a deleted site) are simply missing from the result.
 */
export async function fetchSitesByIds(siteIds: string[]): Promise<Site[]> {
  const ids = Array.from(new Set(siteIds));
  const sites: Site[] = [];
  for (let i = 0; i < ids.length; i += IN_QUERY_LIMIT) {
    const chunk = ids.slice(i, i + IN_QUERY_LIMIT);
    const snapshot = await getDocs(query(collection(firestore, 'sites'), where(documentId(), 'in', chunk)));
    for (const d of snapshot.docs) {
      const data = d.data() as { name?: string; code?: string };
      sites.push({ id: d.id, name: data.name ?? 'Unnamed site', ...(data.code ? { code: data.code } : {}) });
    }
  }
  return sites.sort((a, b) => a.name.localeCompare(b.name));
}
