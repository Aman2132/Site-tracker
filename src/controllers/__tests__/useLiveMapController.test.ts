import { act, renderHook } from '@testing-library/react-native';

import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useLiveMapController } from '@/controllers/useLiveMapController';
import { useMapMotionController } from '@/controllers/useMapMotionController';
import { Person, Site } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  HAS_GOOGLE_MAPS_KEY: true,
  LIVE_MAP: {
    pitch3d: 60,
    zoom3d: 17.5,
    zoomOverview: 15.5,
    sensorIntervalMs: 100,
    cameraAnimationMs: 600,
    markerGlideMs: 900,
  },
}));
jest.mock('@/controllers/useCrewTrackingController', () => ({ useCrewTrackingController: jest.fn() }));
jest.mock('@/controllers/useMapMotionController', () => ({ useMapMotionController: jest.fn() }));

const site: Site = { name: 'Demo', lat: 27.7172, lng: 85.324, radius: 150 };

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
  (useCrewTrackingController as jest.Mock).mockImplementation(() => ({ ...crew, site, loaded: true }));
  (useMapMotionController as jest.Mock).mockReturnValue({ heading: null, pitch: null });
});

describe('useLiveMapController', () => {
  it('starts in 3D over the site on the standard map, where Google draws 3D buildings', () => {
    const { result } = renderHook(() => useLiveMapController());
    expect(result.current.is3d).toBe(true);
    expect(result.current.mapStyle).toBe('standard');
    expect(result.current.initialCamera).toEqual({
      center: { lat: site.lat, lng: site.lng },
      zoom: 17.5,
      pitch: 60,
      heading: 0,
    });
    expect(result.current.camera).toBeNull();
  });

  it('flattens to a north-up overview and back', () => {
    const { result } = renderHook(() => useLiveMapController());
    act(() => result.current.toggle3d());
    expect(result.current.is3d).toBe(false);
    expect(result.current.camera).toMatchObject({ pitch: 0, heading: 0, zoom: 15.5 });

    act(() => result.current.toggle3d());
    expect(result.current.camera).toMatchObject({ pitch: 60, zoom: 17.5 });
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
    expect(result.current.camera).toMatchObject({ heading: 0, pitch: 60 });
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
});
