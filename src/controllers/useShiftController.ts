import { useCallback, useEffect, useState } from 'react';

import { logEvent } from '@/api/eventsApi';
import { fetchPersonProfile, reportCheckedInSite, reportPauseState } from '@/api/peopleApi';
import { closeSession, openSession } from '@/api/sessionsApi';
import { fetchSitesByIds } from '@/api/sitesApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { requestActivityRecognitionPermission } from '@/services/activityRecognitionService';
import { requestLocationPermissions } from '@/services/permissionsService';
import { loadShift, saveShift } from '@/services/shiftStorage';
import { startSharing, stopSharing } from '@/services/sharingService';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';
import { ActiveShift, Site } from '@/types/domain';

const warn = (what: string) => (error: unknown) => console.warn(`[shift] ${what} —`, error);

/** Without a Firebase project there is no backend to open a session on, so the shift lives on the phone only. */
const LOCAL_SESSION_ID = 'local';
/** Stands in for the assigned sites when there is no backend either (the dev bypass). */
const DEMO_SITES: Site[] = [{ id: 'demo', name: 'Demo site' }];

const CHECK_IN_FAILED = "Couldn't reach the server — check your connection and try again.";

function signedInPerson(): { id: string; name: string } | null {
  const profile = useAuthStore.getState().profile;
  return profile ? { id: profile.id, name: profile.name } : null;
}

/** Remembers the shift on the phone and in the store; null clears it. */
async function setShift(shift: ActiveShift | null): Promise<void> {
  const me = signedInPerson();
  if (me) await saveShift(me.id, shift);
  useShiftStore.getState().setActive(shift);
}

/** Starts a shift at `site`. Resolves with a message to show, or null on success. */
async function checkInAt(site: Site): Promise<string | null> {
  const me = signedInPerson();
  if (!me) return 'Sign in first.';
  const permission = await requestLocationPermissions();
  if (!permission.granted) return 'Location permission is needed to check in.';
  // Optional: refused just means walking/driving comes from GPS speed alone.
  await requestActivityRecognitionPermission().catch(() => false);

  const now = Date.now();
  let sessionId = LOCAL_SESSION_ID;
  if (HAS_FIREBASE_CONFIG) {
    try {
      sessionId = await openSession(me.id, site.id, now);
    } catch (error) {
      // ponytail: no offline check-in; it needs the network. Queue it locally like photos if workers are often offline.
      warn('open session failed')(error);
      return CHECK_IN_FAILED;
    }
  }
  await setShift({ siteId: site.id, siteName: site.name, checkedInAt: now, sessionId, paused: false });
  startSharing().catch(warn('start sharing failed'));
  if (HAS_FIREBASE_CONFIG) {
    reportPauseState(me.id, false).catch(warn('pause state failed'));
    reportCheckedInSite(me.id, site.id).catch(warn('site report failed'));
    logEvent(`${me.name} checked in at ${site.name}`, 'info', {
      type: 'checkin',
      personId: me.id,
      siteId: site.id,
    }).catch(warn('activity log failed'));
  }
  return null;
}

/**
 * Ends the shift. Never blocks on the network: a session that can't be closed
 * is left open, and the dashboard judges it from the last position fix.
 */
async function checkOutNow(): Promise<void> {
  const me = signedInPerson();
  const shift = useShiftStore.getState().active;
  await stopSharing().catch(warn('stop sharing failed'));
  if (!me || !shift) return;

  if (HAS_FIREBASE_CONFIG) {
    if (shift.sessionId && shift.sessionId !== LOCAL_SESSION_ID) {
      await closeSession(shift.sessionId, Date.now(), 'signed-off').catch(warn('close session failed'));
    }
    reportCheckedInSite(me.id, null).catch(warn('site report failed'));
    logEvent(`${me.name} checked out of ${shift.siteName}`, 'info', {
      type: 'checkout',
      personId: me.id,
      siteId: shift.siteId,
    }).catch(warn('activity log failed'));
  }
  await setShift(null);
}

/** Pause closes the open session; resume opens a new one on the same site. Resolves with a message on failure. */
async function setPausedNow(paused: boolean): Promise<string | null> {
  const me = signedInPerson();
  const shift = useShiftStore.getState().active;
  if (!me || !shift || shift.paused === paused) return null;

  if (paused) {
    stopSharing().catch(warn('stop sharing failed'));
    if (HAS_FIREBASE_CONFIG && shift.sessionId && shift.sessionId !== LOCAL_SESSION_ID) {
      await closeSession(shift.sessionId, Date.now(), 'paused').catch(warn('close session failed'));
    }
    await setShift({ ...shift, paused: true, sessionId: null });
  } else {
    let sessionId = LOCAL_SESSION_ID;
    if (HAS_FIREBASE_CONFIG) {
      try {
        sessionId = await openSession(me.id, shift.siteId, Date.now());
      } catch (error) {
        warn('reopen session failed')(error);
        return CHECK_IN_FAILED;
      }
    }
    await setShift({ ...shift, paused: false, sessionId });
    startSharing().catch(warn('start sharing failed'));
  }

  if (HAS_FIREBASE_CONFIG) {
    reportPauseState(me.id, paused).catch(warn('pause state failed'));
    logEvent(`${me.name} ${paused ? 'paused' : 'resumed'} sharing`, paused ? 'warn' : 'info', {
      type: paused ? 'pause' : 'resume',
      personId: me.id,
      siteId: shift.siteId,
    }).catch(warn('activity log failed'));
  }
  return null;
}

/**
 * Called by sign-out, while the person is still signed in (the writes need
 * it): checks them out so no session is left open and nothing keeps tracking
 * a phone nobody is signed in on. Safe with no shift (an owner), never throws.
 */
export async function endShiftOnSignOut(): Promise<void> {
  try {
    if (useShiftStore.getState().active) await checkOutNow();
    else await stopSharing();
  } catch (error) {
    warn('end shift on sign-out failed')(error);
  } finally {
    useShiftStore.setState({ active: null, sites: [], loaded: false });
  }
}

/**
 * Worker Home screen: the person's check-in. Shows the sites they're assigned
 * to, and starts or ends the shift. Location sharing runs only while checked
 * in and not paused (it used to start whenever Home opened). The shift is
 * saved on the phone, so an app restart mid-shift picks up where it left off.
 */
export function useShiftController() {
  const personId = useAuthStore(state => state.profile?.id);
  const active = useShiftStore(state => state.active);
  const sites = useShiftStore(state => state.sites);
  const loaded = useShiftStore(state => state.loaded);
  const [loadingSites, setLoadingSites] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSites = useCallback(async () => {
    if (!personId) return;
    setLoadingSites(true);
    try {
      if (!HAS_FIREBASE_CONFIG) {
        useShiftStore.getState().setSites(DEMO_SITES);
        return;
      }
      // A fresh read, not the profile from sign-in: the admin may have assigned sites since.
      const profile = await fetchPersonProfile(personId);
      useShiftStore.getState().setSites(await fetchSitesByIds(profile?.siteIds ?? []));
    } catch (e) {
      warn('load sites failed')(e);
    } finally {
      setLoadingSites(false);
    }
  }, [personId]);

  // Pick the saved shift back up, then (re)start sharing if it was running.
  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    (async () => {
      const saved = await loadShift(personId);
      if (cancelled) return;
      useShiftStore.getState().setActive(saved);
      useShiftStore.getState().setLoaded(true);
      if (saved && !saved.paused) startSharing().catch(warn('restart sharing failed'));
      await refreshSites();
    })();
    return () => {
      cancelled = true;
    };
  }, [personId, refreshSites]);

  const run = useCallback(async (work: () => Promise<string | null | void>) => {
    setBusy(true);
    setError(null);
    try {
      const message = await work();
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const checkIn = useCallback((site: Site) => run(() => checkInAt(site)), [run]);
  const checkOut = useCallback(() => run(checkOutNow), [run]);
  const togglePause = useCallback(
    () => run(() => setPausedNow(!useShiftStore.getState().active?.paused)),
    [run]
  );

  return {
    active,
    paused: active?.paused ?? false,
    sites,
    /** True until the saved shift has been read, so Home doesn't flash the check-in picker for someone mid-shift. */
    loading: !loaded,
    loadingSites,
    busy,
    error,
    checkIn,
    checkOut,
    togglePause,
    refreshSites,
  };
}
