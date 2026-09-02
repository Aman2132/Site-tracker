import { create } from 'zustand';

import { Photo } from '@/types/domain';

interface PhotoState {
  photos: Photo[];
  loaded: boolean;
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Omit<Photo, 'id' | 'synced'>) => void;
  markAllSynced: () => void;
}

export const usePhotoStore = create<PhotoState>(set => ({
  photos: [],
  loaded: false,
  setPhotos: photos => set({ photos, loaded: true }),
  addPhoto: photo =>
    set(state => ({
      photos: [{ ...photo, id: `local-${Date.now()}`, synced: false }, ...state.photos],
    })),
  markAllSynced: () =>
    set(state => ({
      photos: state.photos.map(photo => (photo.synced ? photo : { ...photo, synced: true })),
    })),
}));

export const selectPendingPhotos = (state: PhotoState): Photo[] => state.photos.filter(p => !p.synced);
