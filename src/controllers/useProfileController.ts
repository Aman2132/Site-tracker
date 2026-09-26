import { useCallback, useState } from 'react';

import { updateOwnProfile } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG, PROFILE } from '@/constants/config';
import { performSignOut } from '@/controllers/useAuthController';
import { currentUserEmail } from '@/services/authService';
import { pickAvatarImage } from '@/services/avatarService';
import { useAuthStore } from '@/store/useAuthStore';
import { OwnProfileChanges } from '@/types/domain';

/**
 * Profile tab (owners and workers alike): the signed-in person's own name and
 * photo, plus sign-out. A change is saved to their Firestore profile first
 * and only then shown — so what's on screen is always what's stored. The
 * crew list picks up the change through its live roster subscription.
 */
export function useProfileController() {
  const profile = useAuthStore(state => state.profile);
  const setProfile = useAuthStore(state => state.setProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (changes: OwnProfileChanges) => {
      if (!profile) return;
      setError(null);
      setSaving(true);
      try {
        // Without a Firebase project (demo mode) there's nowhere to save — keep it on this device only.
        if (HAS_FIREBASE_CONFIG) await updateOwnProfile(profile.id, changes);
        setProfile({ ...profile, ...changes });
      } catch {
        setError("Couldn't save that change. Check your connection and try again.");
      } finally {
        setSaving(false);
      }
    },
    [profile, setProfile]
  );

  const saveName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, PROFILE.maxNameChars);
      if (!trimmed || trimmed === profile?.name) return Promise.resolve();
      return save({ name: trimmed });
    },
    [profile?.name, save]
  );

  const changeAvatar = useCallback(async () => {
    setError(null);
    let avatar: string | null;
    try {
      avatar = await pickAvatarImage();
    } catch {
      setError("Couldn't open that photo. Try a different one.");
      return;
    }
    if (avatar) await save({ avatar });
  }, [save]);

  // Firestore can't store `undefined`; an empty string means "no photo" and
  // every avatar display treats it the same as missing.
  const removeAvatar = useCallback(() => save({ avatar: '' }), [save]);

  const signOut = useCallback(() => performSignOut(setProfile), [setProfile]);

  return {
    profile,
    email: currentUserEmail(),
    saving,
    error,
    saveName,
    changeAvatar,
    removeAvatar,
    signOut,
  };
}
