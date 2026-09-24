import { useAuthStore } from '@/store/useAuthStore';
import { useCrewStore } from '@/store/useCrewStore';
import { useEventStore } from '@/store/useEventStore';
import { useSiteStore } from '@/store/useSiteStore';
import { Person, Site } from '@/types/domain';

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 'worker-1',
    name: 'Ramesh Kumar',
    role: 'Driver',
    appRole: 'worker',
    color: '#1a73e8',
    kind: 'still',
    lat: 27.7,
    lng: 85.3,
    accuracy: 10,
    lastFixAt: 0,
    battery: 1,
    paused: false,
    ...overrides,
  };
}

const site: Site = { name: 'Kathmandu Demo Site', lat: 27.7172, lng: 85.324, radius: 150 };

describe('useCrewStore.updatePersonPosition', () => {
  beforeEach(() => useCrewStore.setState({ people: [], loaded: false }));

  it('applies a fix to the matching person only', () => {
    useCrewStore.setState({ people: [person({ id: 'a' }), person({ id: 'b' })], loaded: true });

    useCrewStore.getState().updatePersonPosition('a', { lat: 1, lng: 2, accuracy: 3, kind: 'walk' });

    const [a, b] = useCrewStore.getState().people;
    expect(a).toMatchObject({ lat: 1, lng: 2, accuracy: 3, kind: 'walk' });
    expect(b).toMatchObject({ lat: 27.7, lng: 85.3, kind: 'still' });
  });

  it('stamps the fix with the current time', () => {
    useCrewStore.setState({ people: [person({ id: 'a', lastFixAt: 0 })], loaded: true });
    const before = Date.now();

    useCrewStore.getState().updatePersonPosition('a', { lat: 1, lng: 2, accuracy: 3, kind: 'walk' });

    expect(useCrewStore.getState().people[0].lastFixAt).toBeGreaterThanOrEqual(before);
  });

  it('is a no-op for a person who is not in the roster', () => {
    useCrewStore.setState({ people: [person({ id: 'a' })], loaded: true });

    useCrewStore.getState().updatePersonPosition('ghost', { lat: 1, lng: 2, accuracy: 3, kind: 'walk' });

    expect(useCrewStore.getState().people[0]).toMatchObject({ lat: 27.7, lng: 85.3 });
  });
});

describe('useSiteStore', () => {
  beforeEach(() => useSiteStore.setState({ site: null, loaded: false }));

  it('changes only the radius, keeping the rest of the site', () => {
    useSiteStore.getState().setSite(site);

    useSiteStore.getState().setGeofenceRadius(220);

    expect(useSiteStore.getState().site).toEqual({ ...site, radius: 220 });
  });

  it('ignores a radius change before any site has loaded', () => {
    // The Sites screen can mount before fetchSite resolves.
    expect(() => useSiteStore.getState().setGeofenceRadius(220)).not.toThrow();
    expect(useSiteStore.getState().site).toBeNull();
  });

  it('marks itself loaded once a site arrives', () => {
    expect(useSiteStore.getState().loaded).toBe(false);
    useSiteStore.getState().setSite(site);
    expect(useSiteStore.getState().loaded).toBe(true);
  });
});

describe('useAuthStore', () => {
  it('starts undefined so the navigator can tell "checking" from "signed out"', () => {
    useAuthStore.setState({ profile: undefined });
    expect(useAuthStore.getState().profile).toBeUndefined();

    useAuthStore.getState().setProfile(null);
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('useEventStore', () => {
  it('flips loaded even for an empty feed, so the screen stops spinning', () => {
    useEventStore.setState({ events: [], loaded: false });

    useEventStore.getState().setEvents([]);

    expect(useEventStore.getState().loaded).toBe(true);
  });
});
