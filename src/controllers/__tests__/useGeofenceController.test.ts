import { renderHook } from '@testing-library/react-native';

import { updateGeofenceRadius } from '@/api/siteApi';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useGeofenceController } from '@/controllers/useGeofenceController';
import { useSiteStore } from '@/store/useSiteStore';
import { Person, Site } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  HAS_FIREBASE_CONFIG: true,
  GEOFENCE: { minRadiusMeters: 40, maxRadiusMeters: 400, stepMeters: 10, driftSafeRadiusMeters: 80 },
}));
jest.mock('@/api/siteApi', () => ({ updateGeofenceRadius: jest.fn(async () => undefined) }));
jest.mock('@/controllers/useCrewTrackingController', () => ({ useCrewTrackingController: jest.fn() }));

const site: Site = { name: 'Kathmandu Demo Site', lat: 27.7172, lng: 85.324, radius: 150 };

function person(id: string, lat: number, lng: number): Person {
  return {
    id,
    name: id,
    role: 'Driver',
    appRole: 'worker',
    color: '#1a73e8',
    kind: 'still',
    lat,
    lng,
    accuracy: 10,
    lastFixAt: Date.now(),
    battery: 1,
    paused: false,
  };
}

function mockCrew(people: Person[], siteOverride: Site | null = site) {
  (useCrewTrackingController as jest.Mock).mockReturnValue({
    people,
    site: siteOverride,
    loaded: true,
  });
}

describe('useGeofenceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSiteStore.setState({ site, loaded: true });
  });

  it('counts only the people actually inside the fence', () => {
    mockCrew([person('inside', 27.7173, 85.3241), person('far-away', 27.8, 85.4)]);

    const { result } = renderHook(() => useGeofenceController());

    expect(result.current.peopleInsideFence.map(p => p.id)).toEqual(['inside']);
  });

  it('returns nobody inside while the site is still loading', () => {
    mockCrew([person('someone', 27.7173, 85.3241)], null);

    const { result } = renderHook(() => useGeofenceController());

    expect(result.current.peopleInsideFence).toEqual([]);
  });

  it('flags a radius small enough for GPS drift to cause false arrivals', () => {
    mockCrew([], { ...site, radius: 50 });

    const { result } = renderHook(() => useGeofenceController());

    expect(result.current.isRadiusDriftRisky).toBe(true);
  });

  it('does not flag a radius at the drift-safe boundary', () => {
    // driftSafeRadiusMeters is 80 and the check is `<`, so exactly 80 is fine.
    mockCrew([], { ...site, radius: 80 });

    const { result } = renderHook(() => useGeofenceController());

    expect(result.current.isRadiusDriftRisky).toBe(false);
  });

  it('reports no drift risk before the site has loaded', () => {
    mockCrew([], null);

    const { result } = renderHook(() => useGeofenceController());

    expect(result.current.isRadiusDriftRisky).toBe(false);
  });

  it('applies a radius change locally before the backend confirms it', () => {
    mockCrew([]);

    const { result } = renderHook(() => useGeofenceController());
    result.current.setRadius(220);

    expect(useSiteStore.getState().site?.radius).toBe(220);
    expect(updateGeofenceRadius).toHaveBeenCalledWith(220);
  });

  it('keeps the local radius even if the backend write fails', async () => {
    // The slider must not snap back under the owner's finger on a flaky link.
    (updateGeofenceRadius as jest.Mock).mockRejectedValue(new Error('offline'));
    mockCrew([]);

    const { result } = renderHook(() => useGeofenceController());
    result.current.setRadius(300);
    await Promise.resolve();

    expect(useSiteStore.getState().site?.radius).toBe(300);
  });
});
