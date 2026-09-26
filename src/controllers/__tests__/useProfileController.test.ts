import { act, renderHook } from '@testing-library/react-native';

import { updateOwnProfile } from '@/api/peopleApi';
import { useProfileController } from '@/controllers/useProfileController';
import { pickAvatarImage } from '@/services/avatarService';
import { useAuthStore } from '@/store/useAuthStore';
import { PersonProfile } from '@/types/domain';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true, PROFILE: { maxNameChars: 60 } }));
jest.mock('@/api/peopleApi', () => ({ updateOwnProfile: jest.fn(async () => undefined) }));
jest.mock('@/services/avatarService', () => ({ pickAvatarImage: jest.fn() }));
jest.mock('@/services/authService', () => ({ currentUserEmail: jest.fn(() => 'pooja@site.com') }));
jest.mock('@/controllers/useAuthController', () => ({ performSignOut: jest.fn(async () => undefined) }));

const me: PersonProfile = {
  id: 'worker-9',
  name: 'Pooja Devi',
  role: 'Helper',
  appRole: 'worker',
  color: '#a142f4',
};

describe('useProfileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (updateOwnProfile as jest.Mock).mockResolvedValue(undefined);
    useAuthStore.setState({ profile: me });
  });

  it('shows the signed-in email', () => {
    const { result } = renderHook(() => useProfileController());
    expect(result.current.email).toBe('pooja@site.com');
  });

  it('saves a new name, trimmed, and shows it once stored', async () => {
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.saveName('  Pooja D.  '));

    expect(updateOwnProfile).toHaveBeenCalledWith('worker-9', { name: 'Pooja D.' });
    expect(useAuthStore.getState().profile?.name).toBe('Pooja D.');
  });

  it('does not write an unchanged or blank name', async () => {
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.saveName('Pooja Devi'));
    await act(() => result.current.saveName('   '));

    expect(updateOwnProfile).not.toHaveBeenCalled();
  });

  it('keeps the old name on screen and says so when saving fails', async () => {
    (updateOwnProfile as jest.Mock).mockRejectedValue(new Error('permission-denied'));
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.saveName('Someone Else'));

    expect(useAuthStore.getState().profile?.name).toBe('Pooja Devi');
    expect(result.current.error).toBeTruthy();
    expect(result.current.saving).toBe(false);
  });

  it('saves a picked photo', async () => {
    (pickAvatarImage as jest.Mock).mockResolvedValue('data:image/jpeg;base64,AAA');
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.changeAvatar());

    expect(updateOwnProfile).toHaveBeenCalledWith('worker-9', { avatar: 'data:image/jpeg;base64,AAA' });
    expect(useAuthStore.getState().profile?.avatar).toBe('data:image/jpeg;base64,AAA');
  });

  it('changes nothing when the picker is cancelled', async () => {
    (pickAvatarImage as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.changeAvatar());

    expect(updateOwnProfile).not.toHaveBeenCalled();
  });

  it('removes the photo by storing an empty value (Firestore rejects undefined)', async () => {
    useAuthStore.setState({ profile: { ...me, avatar: 'data:image/jpeg;base64,AAA' } });
    const { result } = renderHook(() => useProfileController());

    await act(() => result.current.removeAvatar());

    expect(updateOwnProfile).toHaveBeenCalledWith('worker-9', { avatar: '' });
    expect(useAuthStore.getState().profile?.avatar).toBe('');
  });
});
