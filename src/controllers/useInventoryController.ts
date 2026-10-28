import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  createInventoryEntry,
  inventoryEntryExists,
  logInventoryUsage,
  newInventoryId,
  subscribeToSiteInventory,
} from '@/api/inventoryApi';
import { fetchPersonProfile } from '@/api/peopleApi';
import { fetchSitesByIds } from '@/api/sitesApi';
import { HAS_FIREBASE_CONFIG, INVENTORY } from '@/constants/config';
import { loadOutbox, saveOutbox } from '@/services/inventoryOutbox';
import { useAuthStore } from '@/store/useAuthStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useShiftStore } from '@/store/useShiftStore';
import { InventoryDraft, InventoryEntry } from '@/types/domain';
import {
  cleanText,
  draftProblem,
  isUsedUp,
  itemSuggestions,
  lastUnitFor,
  mergeInventory,
  usageProblem,
} from '@/utils/inventory';

/** Entries handed to Firestore this app run; shared so two screens never send one twice. */
const inFlight = new Set<string>();

async function dropFromOutbox(personId: string, id: string) {
  const outbox = useInventoryStore.getState().outbox.filter(e => e.id !== id);
  useInventoryStore.getState().setOutbox(outbox);
  await saveOutbox(personId, outbox);
}

/**
 * Sends one saved entry. A fresh one goes straight to Firestore (it shows at
 * once, marked pending, and lands when there's signal). One left over from an
 * earlier app run is checked first: it may have reached the server before the
 * app closed, and the crew may not overwrite an existing entry.
 */
async function send(personId: string, entry: InventoryEntry, fresh: boolean): Promise<string | null> {
  if (inFlight.has(entry.id)) return null;
  inFlight.add(entry.id);
  try {
    if (fresh || !(await inventoryEntryExists(entry.id))) await createInventoryEntry(entry);
    await dropFromOutbox(personId, entry.id);
    return null;
  } catch (error) {
    console.warn('[inventory] send failed —', error);
    return error instanceof Error ? error.message : 'Could not send.';
  } finally {
    inFlight.delete(entry.id);
  }
}

/**
 * Keeps the inventory store live with everything received/used at my sites
 * (not just my own entries), so site-mates can see — but not touch — each
 * other's deliveries. Used by the Items tab and the photo details sheet.
 */
export function useSiteInventoryFeed() {
  const profile = useAuthStore(state => state.profile);
  const personId = profile?.id;
  // Prefer the freshly fetched site list (Home refreshes it): the rules check the
  // server's siteIds, and one stale id would make Firestore reject the whole query.
  const freshSites = useShiftStore(state => state.sites);
  const siteIds = freshSites.length ? freshSites.map(site => site.id) : (profile?.siteIds ?? []);
  const siteIdsKey = siteIds.join(',');
  useEffect(() => {
    if (!personId || !HAS_FIREBASE_CONFIG || siteIds.length === 0) {
      useInventoryStore.getState().setEntries([]);
      useInventoryStore.getState().setLoaded(true);
      return;
    }
    return subscribeToSiteInventory(
      siteIds,
      list => {
        useInventoryStore.getState().setEntries(list);
        useInventoryStore.getState().setLoaded(true);
      },
      error => {
        console.warn('[inventory] live list stopped —', error);
        useInventoryStore.getState().setLoaded(true);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- siteIdsKey stands in for siteIds
  }, [personId, siteIdsKey]);
}

/**
 * Items tab: what this person has logged as received, live (owner edits
 * included), plus adding new entries. Entries are kept on the phone until the
 * server confirms them, so nothing typed without signal is lost.
 */
export function useInventoryController() {
  const profile = useAuthStore(state => state.profile);
  const personId = profile?.id;
  const entries = useInventoryStore(state => state.entries);
  const outbox = useInventoryStore(state => state.outbox);
  const loaded = useInventoryStore(state => state.loaded);
  const sites = useShiftStore(state => state.sites);
  const activeSiteId = useShiftStore(state => state.active?.siteId);
  const [syncError, setSyncError] = useState<string | null>(null);

  const flush = useCallback(async () => {
    if (!personId || !HAS_FIREBASE_CONFIG) return;
    const results = await Promise.all(
      useInventoryStore.getState().outbox.map(entry => send(personId, entry, false))
    );
    setSyncError(results.find(Boolean) ?? null);
  }, [personId]);

  useSiteInventoryFeed();

  // Pick up anything saved but unsent from an earlier run, then send it.
  useEffect(() => {
    if (!personId) return;
    loadOutbox(personId).then(saved => {
      useInventoryStore.getState().setOutbox(saved);
      flush();
    });
  }, [personId, flush]);

  // While anything waits, keep retrying, and retry when the app comes back to the front.
  const waiting = outbox.length > 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(flush, INVENTORY.retryMs);
    const subscription = AppState.addEventListener('change', state => state === 'active' && flush());
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [waiting, flush]);

  // The Home tab normally loads my sites; this covers opening Items first.
  useEffect(() => {
    if (!personId || sites.length || !HAS_FIREBASE_CONFIG) return;
    fetchPersonProfile(personId)
      .then(p => fetchSitesByIds(p?.siteIds ?? []))
      .then(list => useShiftStore.getState().setSites(list))
      .catch(error => console.warn('[inventory] load sites failed —', error));
  }, [personId, sites.length]);

  const items = useMemo(() => mergeInventory(entries, outbox), [entries, outbox]);
  /** For the list: still-in-use first, finished ones at the bottom (stable, so newest first within each). */
  const listed = useMemo(
    () => [...items].sort((a, b) => Number(isUsedUp(a)) - Number(isUsedUp(b))),
    [items]
  );
  const siteNames = useMemo(() => Object.fromEntries(sites.map(s => [s.id, s.name])), [sites]);

  /** Saves one item; resolves with what's wrong, or null when it was saved. */
  const add = useCallback(
    async (draft: InventoryDraft): Promise<string | null> => {
      if (!profile) return 'Sign in again.';
      const problem = draftProblem(draft, INVENTORY);
      if (problem) return problem;
      const note = draft.note?.trim();
      const entry: InventoryEntry = {
        id: newInventoryId(),
        personId: profile.id,
        personName: profile.name,
        siteId: draft.siteId,
        name: cleanText(draft.name),
        quantity: draft.quantity,
        unit: cleanText(draft.unit),
        ...(draft.packCount && draft.packSize
          ? { packCount: draft.packCount, packSize: draft.packSize }
          : {}),
        ...(note ? { note } : {}),
        receivedAt: Date.now(),
      };
      const next = [...useInventoryStore.getState().outbox, entry];
      useInventoryStore.getState().setOutbox(next);
      await saveOutbox(profile.id, next);
      if (HAS_FIREBASE_CONFIG) send(profile.id, entry, true).then(setSyncError);
      return null;
    },
    [profile]
  );

  const suggest = useCallback(
    (typed: string) => itemSuggestions(items, typed, INVENTORY.suggestionCount),
    [items]
  );
  const unitFor = useCallback((name: string) => lastUnitFor(items, name), [items]);

  /** Only the entry's own creator may log usage against it — everyone else just reads it. */
  const canLogUsage = useCallback((entry: InventoryEntry) => entry.personId === personId, [personId]);

  /** Resolves with what's wrong, or null when it was logged. A pending (not-yet-synced) entry can't take usage yet. */
  const logUsage = useCallback(
    async (entry: InventoryEntry, quantity: number, note: string): Promise<string | null> => {
      if (!canLogUsage(entry)) return 'Only who logged this item can log how much was used.';
      if (entry.pending) return 'Still sending this item — try again once it has synced.';
      const problem = usageProblem(entry, quantity, note, INVENTORY.maxNoteChars);
      if (problem) return problem;
      try {
        await logInventoryUsage(entry.id, quantity, note);
        return null;
      } catch (error) {
        console.warn('[inventory] log usage failed —', error);
        return error instanceof Error ? error.message : 'Could not save that.';
      }
    },
    [canLogUsage]
  );

  return {
    items: listed,
    loaded,
    sites,
    siteNames,
    /** The site I'm checked in at, else my only site, else none (the sheet asks). */
    defaultSiteId: activeSiteId ?? (sites.length === 1 ? sites[0].id : ''),
    waitingCount: items.filter(e => e.pending).length,
    syncError,
    canLogUsage,
    logUsage,
    add,
    suggest,
    unitFor,
  };
}
