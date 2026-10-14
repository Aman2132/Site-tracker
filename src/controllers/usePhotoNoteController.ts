import { useCallback, useMemo } from 'react';

import { useSiteInventoryFeed } from './useInventoryController';

import { logInventoryUsage } from '@/api/inventoryApi';
import { INVENTORY, PHOTO_NOTE } from '@/constants/config';
import { setLocalPhotoInventory, setLocalPhotoNote } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { linkableEntries, usageProblem } from '@/utils/inventory';
import { cleanNote, sharedValue } from '@/utils/photos';

/**
 * The photo details sheet's state (note + optional inventory entry it is proof
 * for), for one capture (Queue) or a batch picked from the camera tray. While
 * it is open those captures are held back from background upload, because an
 * uploaded record is never edited — the note and link must go with it.
 */
export function usePhotoNoteController() {
  const editingIds = usePhotoStore(state => state.noteEditingIds);
  const photos = usePhotoStore(state => state.photos);
  const setNoteEditingIds = usePhotoStore(state => state.setNoteEditingIds);
  const myId = useAuthStore(state => state.profile?.id);
  const entries = useInventoryStore(state => state.entries);
  useSiteInventoryFeed();

  /** The selection, minus anything uploaded in the meantime (too late to change). */
  const editing = useMemo(
    () => photos.filter(photo => editingIds.includes(photo.id) && !photo.synced),
    [photos, editingIds]
  );

  /** Only my own deliveries at the photos' site can take them as proof (any site when they differ). */
  const linkable = useMemo(() => {
    if (!editing.length || !myId) return [];
    return linkableEntries(entries, myId, sharedValue(editing.map(photo => photo.siteId)) || undefined);
  }, [entries, myId, editing]);

  const openNote = useCallback(
    (ids: string | string[]) => setNoteEditingIds(Array.isArray(ids) ? ids : [ids]),
    [setNoteEditingIds]
  );
  const closeNote = useCallback(() => setNoteEditingIds([]), [setNoteEditingIds]);
  /** Adds or drops one capture from the batch being edited. */
  const toggle = useCallback(
    (id: string) => {
      const current = usePhotoStore.getState().noteEditingIds;
      setNoteEditingIds(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
    },
    [setNoteEditingIds]
  );

  /**
   * Applies the note and link to every selected capture (replacing what each
   * had) and, when `used` is given, logs that much of the linked item as
   * consumed — once for the whole batch, with the note as its reason. Checks
   * the usage first so nothing is saved half-way. Resolves with what's wrong, or null.
   */
  const saveNote = useCallback(async (input: string, inventoryId: string | null, used: number | null) => {
    const { noteEditingIds, photos: all, setNote, setInventoryId } = usePhotoStore.getState();
    const note = cleanNote(input, PHOTO_NOTE.maxChars);
    const entry = inventoryId
      ? useInventoryStore.getState().entries.find(e => e.id === inventoryId)
      : undefined;
    // A photo note may be longer than a usage note is allowed to be; the usage log keeps the start.
    const usageNote = (note || 'Photo proof').slice(0, INVENTORY.maxNoteChars);
    if (used != null) {
      if (!entry) return 'That item is not available any more.';
      const problem = usageProblem(entry, used, usageNote, INVENTORY.maxNoteChars);
      if (problem) return problem;
    }
    for (const photo of all) {
      if (!noteEditingIds.includes(photo.id) || photo.synced) continue;
      setNote(photo.id, note);
      setLocalPhotoNote(photo.personId, photo.id, note);
      setInventoryId(photo.id, inventoryId);
      setLocalPhotoInventory(photo.personId, photo.id, inventoryId);
    }
    // Not awaited: offline, Firestore only resolves once the server has it; the sheet shouldn't hang.
    if (used != null && entry) {
      logInventoryUsage(entry.id, used, usageNote).catch(error =>
        console.warn('[inventory] usage from photo failed —', error)
      );
    }
    return null;
  }, []);

  return {
    editing,
    /** Prefilled when every selected capture has the same note / link. */
    sharedNote: sharedValue(editing.map(photo => photo.note)),
    sharedInventoryId: sharedValue(editing.map(photo => photo.inventoryId)) || undefined,
    visible: editingIds.length > 0,
    linkable,
    openNote,
    closeNote,
    toggle,
    saveNote,
  };
}
