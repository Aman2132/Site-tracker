import { create } from 'zustand';

import { Photo } from '@/types/domain';

/** Absent from `syncStatus` means idle: queued, or already uploaded. */
export type PhotoSyncStatus = 'syncing' | 'failed';

interface PhotoState {
  photos: Photo[];
  loaded: boolean;
  /**
   * Whose photos are currently in `photos`. Two workers signing into the
   * same handset must not inherit each other's list, so the controller
   * reloads whenever this stops matching the signed-in person.
   */
  loadedFor: string | null;
  /** Per-photo upload state, shared by every screen showing the queue. */
  syncStatus: Record<string, PhotoSyncStatus>;
  /** The capture whose note is open for typing; background sync leaves it alone. */
  noteEditingId: string | null;
  setPhotos: (photos: Photo[], forPersonId: string) => void;
  /** Adds a finished capture (id already assigned — see utils/photos newLocalPhotoId) to the top. */
  addPhoto: (photo: Photo) => void;
  markAllSynced: () => void;
  markSynced: (ids: string[]) => void;
  /** Empty note removes it. */
  setNote: (id: string, note: string) => void;
  setSyncStatus: (id: string, status: PhotoSyncStatus | null) => void;
  setNoteEditingId: (id: string | null) => void;
  clear: () => void;
}

export const usePhotoStore = create<PhotoState>(set => ({
  photos: [],
  loaded: false,
  loadedFor: null,
  syncStatus: {},
  noteEditingId: null,
  setPhotos: (photos, forPersonId) => set({ photos, loaded: true, loadedFor: forPersonId }),
  addPhoto: photo => set(state => ({ photos: [photo, ...state.photos] })),
  markAllSynced: () =>
    set(state => ({
      photos: state.photos.map(photo => (photo.synced ? photo : { ...photo, synced: true })),
    })),
  markSynced: ids =>
    set(state => ({
      photos: state.photos.map(photo => (ids.includes(photo.id) ? { ...photo, synced: true } : photo)),
    })),
  setNote: (id, note) =>
    set(state => ({
      photos: state.photos.map(photo => {
        if (photo.id !== id) return photo;
        const { note: _old, ...rest } = photo;
        return note ? { ...rest, note } : rest;
      }),
    })),
  setSyncStatus: (id, status) =>
    set(state => {
      const { [id]: _old, ...rest } = state.syncStatus;
      return { syncStatus: status ? { ...rest, [id]: status } : rest };
    }),
  setNoteEditingId: id => set({ noteEditingId: id }),
  clear: () => set({ photos: [], loaded: false, loadedFor: null, syncStatus: {}, noteEditingId: null }),
}));

export const selectPendingPhotos = (state: PhotoState): Photo[] => state.photos.filter(p => !p.synced);
