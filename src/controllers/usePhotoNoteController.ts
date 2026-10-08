import { useCallback } from 'react';

import { PHOTO_NOTE } from '@/constants/config';
import { setLocalPhotoNote } from '@/services/photoQueueStorage';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { cleanNote } from '@/utils/photos';

/**
 * The note sheet's state, shared by the Camera (right after a shot) and the
 * Queue. While a note is open its photo is held back from background upload,
 * because an uploaded record is never edited — the note must go with it.
 */
export function usePhotoNoteController(targetId?: string | null) {
  /** The given capture while it can still take a note (not yet uploaded). */
  const target = usePhotoStore(state => state.photos.find(photo => photo.id === targetId && !photo.synced));
  const editingId = usePhotoStore(state => state.noteEditingId);
  const editing = usePhotoStore(state => state.photos.find(photo => photo.id === state.noteEditingId));
  const setNoteEditingId = usePhotoStore(state => state.setNoteEditingId);

  const openNote = useCallback((id: string) => setNoteEditingId(id), [setNoteEditingId]);
  const closeNote = useCallback(() => setNoteEditingId(null), [setNoteEditingId]);

  const saveNote = useCallback((input: string) => {
    const { noteEditingId, photos, setNote } = usePhotoStore.getState();
    const photo: Photo | undefined = photos.find(p => p.id === noteEditingId);
    // Uploaded in the meantime: too late to attach, so don't pretend.
    if (!photo || photo.synced) return;
    const note = cleanNote(input, PHOTO_NOTE.maxChars);
    setNote(photo.id, note);
    setLocalPhotoNote(photo.personId, photo.id, note);
  }, []);

  return {
    target,
    editing,
    visible: editingId !== null && editing !== undefined,
    openNote,
    closeNote,
    saveNote,
  };
}
