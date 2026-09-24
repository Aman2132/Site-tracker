import { create } from 'zustand';

import { Photo } from '@/types/domain';

interface PhotoState {
  photos: Photo[];
  loaded: boolean;
  /**
   * Whose photos are currently in `photos`. Two workers signing into the
   * same handset must not inherit each other's list, so the controller
   * reloads whenever this stops matching the signed-in person.
   */
  loadedFor: string | null;
  setPhotos: (photos: Photo[], forPersonId: string) => void;
  addPhoto: (photo: Omit<Photo, 'id' | 'synced'>) => void;
  markAllSynced: () => void;
  clear: () => void;
}

export const usePhotoStore = create<PhotoState>(set => ({
  photos: [],
  loaded: false,
  loadedFor: null,
  setPhotos: (photos, forPersonId) => set({ photos, loaded: true, loadedFor: forPersonId }),
  addPhoto: photo =>
    set(state => ({
      // Random suffix, not just the timestamp — two captures inside the same
      // millisecond would otherwise collide and overwrite each other's
      // Supabase Storage path (personId/photoId.jpg, uploaded with upsert).
      photos: [
        { ...photo, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, synced: false },
        ...state.photos,
      ],
    })),
  markAllSynced: () =>
    set(state => ({
      photos: state.photos.map(photo => (photo.synced ? photo : { ...photo, synced: true })),
    })),
  clear: () => set({ photos: [], loaded: false, loadedFor: null }),
}));

export const selectPendingPhotos = (state: PhotoState): Photo[] => state.photos.filter(p => !p.synced);
