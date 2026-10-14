import { act, renderHook } from '@testing-library/react-native';

import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useLiveMapController } from '@/controllers/useLiveMapController';
import { useMapMotionController } from '@/controllers/useMapMotionController';
import { getCurrentPosition } from '@/services/locationService';
import { requestForegroundLocationPermission } from '@/services/permissionsService';
import { Person } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  DEFAULT_COORDS: { lat: 1, lng: 2 },
  HAS_GOOGLE_MAPS_KEY: true,
  LIVE_MAP: {
    pitch3d: 60,
    zoom3d: 17.5,
    zoomOverview: 15.5,
    sensorIntervalMs: 100,
    cameraAnimationMs: 600,
    markerGlideMs: 900,
    zoomMyLocation: 17,
    noticeMs: 3500,
  },
}));
jest.mock('@/services/locationService', () => ({ getCurrentPosition: jest.fn() }));
jest.mock('@/services/permissionsService', () => ({ requestForegroundLocationPermission: jest.fn() }));
jest.mock('@/controllers/useCrewTrackingController', () => ({ useCrewTrackingController: jest.fn() }));
jest.mock('@/controllers/useMapMotionController', () => ({ useMapMotionController: jest.fn() }));

function person(id: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    name: id,
    role: 'Driver',
    appRole: 'worker',
    color: '#1a73e8',
    kind: 'still',
    lat: 27.7172,
    lng: 85.324,
    accuracy: 5,
    lastFixAt: Date.now(),
    battery: 1,
    paused: false,
    ...overrides,
  } as Person;
}

let crew: { people: Person[]; trails: Record<string, { lat: number; lng: number }[]> };

beforeEach(() => {
  crew = { people: [person('a')], trails: {} };
  (useCrewTrackingController as jest.Mock).mockImplementation(() => ({ ...crew, loaded: true }));
  (useMapMotionController as jest.Mock).mockReturnValue({ heading: null, pitch: null });
});

describe('useLiveMapController', () => {
  it('starts as a flat overview centred on the crew', () => {
    crew = { people: [person('a', { lat: 10, lng: 20 }), person('b', { lat: 20, lng: 40 })], trails: {} };
    const { result } = renderHook(() => useLiveMapController());
    expect(result.current.is3d).toBe(false);
    expect(result.current.mapStyle).toBe('standard');
    expect(result.current.initialCamera).toEqual({
      center: { lat: 15, lng: 30 },
      zoom: 15.5,
      pitch: 0,
      heading: 0,
    });
    expect(result.current.camera).toBeNull();
  });

  it('starts over the default location when nobody has reported a position yet', () => {
    crew = { people: [person('a', { lat: 0, lng: 0, lastFixAt: 0 })], trails: {} };
    const { result } = renderHook(() => useLiveMapController());
    expect(result.current.initialCamera?.center).toEqual({ lat: 1, lng: 2 });
  });

  it('keeps its starting view while people move, so the map does not jump', () => {
    const { result, rerender } = renderHook(() => useLiveMapController());
    const start = result.current.initialCamera;
    crew = { ...crew, people: [person('a', { lat: 30, lng: 50 })] };
    rerender({});
    expect(result.current.initialCamera).toBe(start);
  });

  it('re-centres on wherever the crew is now', () => {
    const { result, rerender } = renderHook(() => useLiveMapController());
    crew = { ...crew, people: [person('a', { lat: 30, lng: 50 })] };
    rerender({});
    act(() => result.current.recenter());
    expect(result.current.camera).toMatchObject({ center: { lat: 30, lng: 50 }, zoom: 15.5 });
  });

  it('tilts into 3D and back to a north-up overview', () => {
    const { result } = renderHook(() => useLiveMapController());
    act(() => result.current.toggle3d());
    expect(result.current.is3d).toBe(true);
    expect(result.current.camera).toMatchObject({ pitch: 60, zoom: 17.5 });

    act(() => result.current.toggle3d());
    expect(result.current.camera).toMatchObject({ pitch: 0, heading: 0, zoom: 15.5 });
  });

  it('gives every camera command a new id so the map applies it once', () => {
    const { result } = renderHook(() => useLiveMapController());
    act(() => result.current.recenter());
    const first = result.current.camera?.id;
    act(() => result.current.recenter());
    expect(result.current.camera?.id).not.toBe(first);
  });

  it('cycles through every map style and wraps around', () => {
    const { result } = renderHook(() => useLiveMapController());
    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      seen.push(result.current.mapStyle);
      act(() => result.current.cycleMapStyle());
    }
    expect(seen).toEqual(['standard', 'hybrid', 'satellite', 'terrain', 'standard']);
  });

  it('turns motion mode on and feeds only heading/pitch to the camera, never the centre', () => {
    const { result, rerender } = renderHook(() => useLiveMapController());
    act(() => result.current.toggle3d()); // tilt only applies in 3D
    act(() => result.current.toggleMotionMode());
    expect(useMapMotionController).toHaveBeenLastCalledWith(true);

    (useMapMotionController as jest.Mock).mockReturnValue({ heading: 90, pitch: 45 });
    rerender({});

    expect(result.current.camera).toMatchObject({ heading: 90, pitch: 45 });
    expect(result.current.camera?.center).toBeUndefined();
  });

  it('settles back north-up when motion mode is turned off', () => {
    const { result } = renderHook(() => useLiveMapController());
    act(() => result.current.toggleMotionMode());
    act(() => result.current.toggleMotionMode());
    expect(result.current.motionMode).toBe(false);
    expect(result.current.camera).toMatchObject({ heading: 0, pitch: 0 });
  });

  it('flies to a selected person, then follows them as they move', () => {
    const { result, rerender } = renderHook(() => useLiveMapController());
    act(() => result.current.selectPerson(crew.people[0]));
    expect(result.current.selectedPerson?.id).toBe('a');
    expect(result.current.camera).toMatchObject({ center: { lat: 27.7172, lng: 85.324 }, zoom: 17.5 });

    crew = { ...crew, people: [person('a', { lat: 27.718 })] };
    rerender({});

    expect(result.current.selectedPerson?.lat).toBe(27.718);
    expect(result.current.camera).toMatchObject({ center: { lat: 27.718 }, durationMs: 900 });
    expect(result.current.camera?.zoom).toBeUndefined();
  });

  it('stops following after the selection is cleared', () => {
    const { result } = renderHook(() => useLiveMapController());
    act(() => result.current.selectPerson(crew.people[0]));
    act(() => result.current.clearSelection());
    expect(result.current.selectedPerson).toBeNull();
  });

  it('shows a direction arrow only for people who are moving', () => {
    crew = {
      people: [person('walker', { kind: 'walk' }), person('idle', { kind: 'still' })],
      trails: {
        walker: [
          { lat: 27.7, lng: 85.3 },
          { lat: 27.7, lng: 85.301 },
        ],
        idle: [
          { lat: 27.7, lng: 85.3 },
          { lat: 27.701, lng: 85.3 },
        ],
      },
    };
    const { result } = renderHook(() => useLiveMapController());
    expect(result.current.headings.walker).toBeCloseTo(90, 0);
    expect(result.current.headings.idle).toBeNull();
  });

  describe('my location', () => {
    beforeEach(() => {
      (getCurrentPosition as jest.Mock).mockReset();
      (requestForegroundLocationPermission as jest.Mock).mockReset();
    });

    it('flies to where this phone is', async () => {
      (requestForegroundLocationPermission as jest.Mock).mockResolvedValue(true);
      (getCurrentPosition as jest.Mock).mockResolvedValue({ lat: 27.7, lng: 85.3, accuracy: 10 });
      const { result } = renderHook(() => useLiveMapController());

      await act(() => result.current.goToMyLocation());

      expect(result.current.camera).toMatchObject({ center: { lat: 27.7, lng: 85.3 }, zoom: 17 });
      expect(result.current.locating).toBe(false);
      expect(result.current.notice).toBeNull();
    });

    it('stops following a selected crew member, so the camera stays on you', async () => {
      (requestForegroundLocationPermission as jest.Mock).mockResolvedValue(true);
      (getCurrentPosition as jest.Mock).mockResolvedValue({ lat: 27.7, lng: 85.3, accuracy: 10 });
      const { result } = renderHook(() => useLiveMapController());
      act(() => result.current.selectPerson(crew.people[0]));

      await act(() => result.current.goToMyLocation());

      expect(result.current.selectedPerson).toBeNull();
    });

    it('explains, and does not move, when location permission is refused', async () => {
      (requestForegroundLocationPermission as jest.Mock).mockResolvedValue(false);
      const { result } = renderHook(() => useLiveMapController());

      await act(() => result.current.goToMyLocation());

      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(result.current.camera).toBeNull();
      expect(result.current.notice).toMatch(/allow location/i);
    });

    it('explains when the phone has no position to give', async () => {
      (requestForegroundLocationPermission as jest.Mock).mockResolvedValue(true);
      (getCurrentPosition as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useLiveMapController());

      await act(() => result.current.goToMyLocation());

      expect(result.current.camera).toBeNull();
      expect(result.current.notice).toMatch(/couldn't find your location/i);
    });
  });
});
