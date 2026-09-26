import { act, renderHook } from '@testing-library/react-native';

import { logEvent } from '@/api/eventsApi';
import { updatePersonProfile } from '@/api/peopleApi';
import { useCrewManagementController } from '@/controllers/useCrewManagementController';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useAuthStore } from '@/store/useAuthStore';
import { Person } from '@/types/domain';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/peopleApi', () => ({ updatePersonProfile: jest.fn(async () => undefined) }));
jest.mock('@/api/eventsApi', () => ({ logEvent: jest.fn(async () => undefined) }));
jest.mock('@/controllers/useCrewTrackingController', () => ({ useCrewTrackingController: jest.fn() }));

function person(overrides: Partial<Person>): Person {
  return {
    id: 'worker-1',
    name: 'Ramesh Kumar',
    role: 'Driver',
    appRole: 'worker',
    color: '#1a73e8',
    kind: 'still',
    lat: 27.7,
    lng: 85.3,
    accuracy: 8,
    lastFixAt: 1,
    paused: false,
    ...overrides,
  };
}

const ramesh = person({ id: 'worker-1', name: 'Ramesh Kumar' });
const pooja = person({ id: 'worker-2', name: 'Pooja Devi', active: false });
const arjun = person({ id: 'worker-3', name: 'Arjun Thakur' });
const admin = person({ id: 'owner-1', name: 'Administrator', appRole: 'owner' });

describe('useCrewManagementController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (updatePersonProfile as jest.Mock).mockResolvedValue(undefined);
    (useCrewTrackingController as jest.Mock).mockReturnValue({
      people: [ramesh, pooja, arjun, admin],
      loaded: true,
    });
    useAuthStore.setState({
      profile: {
        id: 'owner-1',
        name: 'Administrator',
        role: 'Administrator',
        appRole: 'owner',
        color: '#1c4ff0',
      },
    });
  });

  it('lists active people alphabetically, deactivated ones last', () => {
    const { result } = renderHook(() => useCrewManagementController());

    expect(result.current.crew.map(p => p.name)).toEqual([
      'Administrator',
      'Arjun Thakur',
      'Ramesh Kumar',
      'Pooja Devi',
    ]);
  });

  it('saves a new job title, trimmed, and records it in the activity feed', async () => {
    const { result } = renderHook(() => useCrewManagementController());

    await act(() => result.current.saveJobTitle(ramesh, '  Mason · Crew B  '));

    expect(updatePersonProfile).toHaveBeenCalledWith('worker-1', { role: 'Mason · Crew B' });
    expect(logEvent).toHaveBeenCalledWith(expect.stringContaining("Ramesh Kumar's job title"), 'info');
  });

  it('does not write an unchanged or blank job title', async () => {
    const { result } = renderHook(() => useCrewManagementController());

    await act(() => result.current.saveJobTitle(ramesh, 'Driver'));
    await act(() => result.current.saveJobTitle(ramesh, '   '));

    expect(updatePersonProfile).not.toHaveBeenCalled();
  });

  it('promotes a worker to owner', async () => {
    const { result } = renderHook(() => useCrewManagementController());

    await act(() => result.current.setAppRole(ramesh, 'owner'));

    expect(updatePersonProfile).toHaveBeenCalledWith('worker-1', { appRole: 'owner' });
  });

  it('deactivates and reactivates', async () => {
    const { result } = renderHook(() => useCrewManagementController());

    await act(() => result.current.setActive(ramesh, false));
    await act(() => result.current.setActive(pooja, true));

    expect(updatePersonProfile).toHaveBeenCalledWith('worker-1', { active: false });
    expect(updatePersonProfile).toHaveBeenCalledWith('worker-2', { active: true });
  });

  it('shows an error and stops saving when the write is rejected', async () => {
    (updatePersonProfile as jest.Mock).mockRejectedValue(new Error('permission-denied'));
    const { result } = renderHook(() => useCrewManagementController());

    await act(() => result.current.setActive(ramesh, false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.saving).toBe(false);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('knows when the owner is looking at themselves', () => {
    const { result } = renderHook(() => useCrewManagementController());

    act(() => result.current.select('owner-1'));
    expect(result.current.selectedIsMe).toBe(true);

    act(() => result.current.select('worker-1'));
    expect(result.current.selectedIsMe).toBe(false);
  });

  it('follows the selected person live, so a saved change shows in the open sheet', () => {
    const { result, rerender } = renderHook(() => useCrewManagementController());
    act(() => result.current.select('worker-1'));

    (useCrewTrackingController as jest.Mock).mockReturnValue({
      people: [{ ...ramesh, role: 'Mason' }, pooja, arjun, admin],
      loaded: true,
    });
    rerender({});

    expect(result.current.selectedPerson?.role).toBe('Mason');
  });
});
