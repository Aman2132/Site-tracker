import { act, renderHook, waitFor } from '@testing-library/react-native';

import { logEvent } from '@/api/eventsApi';
import { fetchPersonProfile, reportCheckedInSite, reportPauseState } from '@/api/peopleApi';
import { closeSession, openSession } from '@/api/sessionsApi';
import { fetchSitesByIds } from '@/api/sitesApi';
import { endShiftOnSignOut, useShiftController } from '@/controllers/useShiftController';
import { requestLocationPermissions } from '@/services/permissionsService';
import { loadShift, saveShift } from '@/services/shiftStorage';
import { startSharing, stopSharing } from '@/services/sharingService';
import { useAuthStore } from '@/store/useAuthStore';
import { useShiftStore } from '@/store/useShiftStore';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/eventsApi', () => ({ logEvent: jest.fn(async () => undefined) }));
jest.mock('@/api/peopleApi', () => ({
  fetchPersonProfile: jest.fn(),
  reportCheckedInSite: jest.fn(async () => undefined),
  reportPauseState: jest.fn(async () => undefined),
}));
jest.mock('@/api/sessionsApi', () => ({ openSession: jest.fn(), closeSession: jest.fn(async () => undefined) }));
jest.mock('@/api/sitesApi', () => ({ fetchSitesByIds: jest.fn() }));
jest.mock('@/services/activityRecognitionService', () => ({
  requestActivityRecognitionPermission: jest.fn(async () => true),
}));
jest.mock('@/services/permissionsService', () => ({
  requestLocationPermissions: jest.fn(async () => ({ granted: true, background: true })),
}));
jest.mock('@/services/shiftStorage', () => ({
  loadShift: jest.fn(async () => null),
  saveShift: jest.fn(async () => undefined),
}));
jest.mock('@/services/sharingService', () => ({
  startSharing: jest.fn(async () => undefined),
  stopSharing: jest.fn(async () => undefined),
}));

const site = { id: 'site-1', name: 'Tower B', code: 'NOI-B' };

beforeEach(() => {
  jest.clearAllMocks();
  useShiftStore.setState({ active: null, sites: [], loaded: false });
  useAuthStore.setState({
    profile: { id: 'w1', name: 'Pooja', role: 'Helper', appRole: 'worker', color: '#a142f4' },
  });
  (loadShift as jest.Mock).mockResolvedValue(null);
  (openSession as jest.Mock).mockResolvedValue('sess-1');
  (closeSession as jest.Mock).mockResolvedValue(undefined);
  (fetchPersonProfile as jest.Mock).mockResolvedValue({ siteIds: ['site-1'] });
  (fetchSitesByIds as jest.Mock).mockResolvedValue([site]);
  (requestLocationPermissions as jest.Mock).mockResolvedValue({ granted: true, background: true });
});

async function mounted() {
  const hook = renderHook(() => useShiftController());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await waitFor(() => expect(hook.result.current.sites).toEqual([site]));
  return hook;
}

describe('useShiftController', () => {
  it('lists the sites assigned in a fresh read of the profile', async () => {
    await mounted();
    expect(fetchSitesByIds).toHaveBeenCalledWith(['site-1']);
  });

  it('checks in: opens a session, starts sharing, remembers the shift and tells the dashboard', async () => {
    const { result } = await mounted();

    await act(() => result.current.checkIn(site));

    expect(openSession).toHaveBeenCalledWith('w1', 'site-1', expect.any(Number));
    expect(startSharing).toHaveBeenCalled();
    expect(result.current.active).toMatchObject({ siteId: 'site-1', sessionId: 'sess-1', paused: false });
    expect(saveShift).toHaveBeenCalledWith('w1', expect.objectContaining({ siteId: 'site-1' }));
    expect(reportCheckedInSite).toHaveBeenCalledWith('w1', 'site-1');
    expect(logEvent).toHaveBeenCalledWith(
      'Pooja checked in at Tower B',
      'info',
      expect.objectContaining({ type: 'checkin', siteId: 'site-1', personId: 'w1' })
    );
  });

  it('does not check in, and says why, when the session cannot be opened', async () => {
    (openSession as jest.Mock).mockRejectedValue(new Error('offline'));
    const { result } = await mounted();

    await act(() => result.current.checkIn(site));

    expect(result.current.active).toBeNull();
    expect(result.current.error).toMatch(/connection/i);
    expect(startSharing).not.toHaveBeenCalled();
  });

  it('does not check in without location permission', async () => {
    (requestLocationPermissions as jest.Mock).mockResolvedValue({ granted: false, background: false });
    const { result } = await mounted();

    await act(() => result.current.checkIn(site));

    expect(openSession).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/location permission/i);
  });

  it('checks out: closes the session as signed-off, stops sharing and clears the shift', async () => {
    const { result } = await mounted();
    await act(() => result.current.checkIn(site));

    await act(() => result.current.checkOut());

    expect(closeSession).toHaveBeenCalledWith('sess-1', expect.any(Number), 'signed-off');
    expect(stopSharing).toHaveBeenCalled();
    expect(result.current.active).toBeNull();
    expect(saveShift).toHaveBeenLastCalledWith('w1', null);
    expect(reportCheckedInSite).toHaveBeenLastCalledWith('w1', null);
  });

  it('still checks out locally when the session cannot be closed', async () => {
    (closeSession as jest.Mock).mockRejectedValue(new Error('offline'));
    const { result } = await mounted();
    await act(() => result.current.checkIn(site));

    await act(() => result.current.checkOut());

    expect(result.current.active).toBeNull();
  });

  it('pause closes the session; resume opens a new one on the same site', async () => {
    const { result } = await mounted();
    await act(() => result.current.checkIn(site));
    (openSession as jest.Mock).mockResolvedValue('sess-2');

    await act(() => result.current.togglePause());
    expect(closeSession).toHaveBeenCalledWith('sess-1', expect.any(Number), 'paused');
    expect(result.current.active).toMatchObject({ paused: true, sessionId: null });
    expect(reportPauseState).toHaveBeenLastCalledWith('w1', true);
    expect(stopSharing).toHaveBeenCalled();

    await act(() => result.current.togglePause());
    expect(openSession).toHaveBeenLastCalledWith('w1', 'site-1', expect.any(Number));
    expect(result.current.active).toMatchObject({ paused: false, sessionId: 'sess-2', siteId: 'site-1' });
  });

  it('stays paused when resuming cannot reach the server', async () => {
    const { result } = await mounted();
    await act(() => result.current.checkIn(site));
    await act(() => result.current.togglePause());
    (openSession as jest.Mock).mockRejectedValue(new Error('offline'));

    await act(() => result.current.togglePause());

    expect(result.current.paused).toBe(true);
    expect(result.current.error).toMatch(/connection/i);
  });

  it('picks a saved shift back up after a restart and restarts sharing', async () => {
    (loadShift as jest.Mock).mockResolvedValue({
      siteId: 'site-1',
      siteName: 'Tower B',
      checkedInAt: 1,
      sessionId: 'sess-9',
      paused: false,
    });

    const { result } = await mounted();

    expect(result.current.active?.sessionId).toBe('sess-9');
    expect(startSharing).toHaveBeenCalled();
  });

  it('does not restart sharing for a saved shift that was paused', async () => {
    (loadShift as jest.Mock).mockResolvedValue({
      siteId: 'site-1',
      siteName: 'Tower B',
      checkedInAt: 1,
      sessionId: null,
      paused: true,
    });

    await mounted();

    expect(startSharing).not.toHaveBeenCalled();
  });
});

describe('endShiftOnSignOut', () => {
  it('checks out an open shift, then clears the store for the next person', async () => {
    useShiftStore.setState({
      active: { siteId: 'site-1', siteName: 'Tower B', checkedInAt: 1, sessionId: 'sess-1', paused: false },
      sites: [site],
    });

    await endShiftOnSignOut();

    expect(closeSession).toHaveBeenCalledWith('sess-1', expect.any(Number), 'signed-off');
    expect(useShiftStore.getState()).toMatchObject({ active: null, sites: [] });
  });

  it('just stops tracking when there is no shift (an owner)', async () => {
    await endShiftOnSignOut();

    expect(closeSession).not.toHaveBeenCalled();
    expect(stopSharing).toHaveBeenCalled();
  });
});
