import { act, renderHook } from '@testing-library/react-native';

import { refreshPhotoStamp } from '@/controllers/photoStampActions';
import { usePhotoNoteController } from '@/controllers/usePhotoNoteController';
import { setLocalPhotoNote } from '@/services/photoQueueStorage';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';

jest.mock('@/controllers/useInventoryController', () => ({ useSiteInventoryFeed: jest.fn() }));
jest.mock('@/api/inventoryApi', () => ({ logInventoryUsage: jest.fn() }));
jest.mock('@/constants/config', () => ({ PHOTO_NOTE: { maxChars: 500 }, INVENTORY: { maxNoteChars: 500 } }));
jest.mock('@/services/photoQueueStorage', () => ({
  setLocalPhotoNote: jest.fn(async () => undefined),
  setLocalPhotoInventory: jest.fn(async () => undefined),
}));
jest.mock('@/controllers/photoStampActions', () => ({
  refreshPhotoStamp: jest.fn(async (photo: unknown) => photo),
}));

const photo: Photo = {
  id: 'local-1-test',
  uri: 'file:///photo.jpg',
  personId: 'worker',
  task: 'Inspection',
  lat: 27.7,
  lng: 85.3,
  accuracy: 5,
  takenAt: 1,
  plusCode: 'code',
  synced: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  usePhotoStore.getState().clear();
  usePhotoStore.setState({ photos: [photo], noteEditingIds: [photo.id] });
});

it('persists the final note before regenerating the stamped image', async () => {
  const { result } = renderHook(() => usePhotoNoteController());
  await act(async () => {
    expect(await result.current.saveNote('  Final inspection  ', null, null)).toBeNull();
  });
  expect(setLocalPhotoNote).toHaveBeenCalledWith('worker', photo.id, 'Final inspection');
  expect(refreshPhotoStamp).toHaveBeenCalledWith(expect.objectContaining({ note: 'Final inspection' }));
  expect((setLocalPhotoNote as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
    (refreshPhotoStamp as jest.Mock).mock.invocationCallOrder[0]
  );
});

it('keeps the note saved and reports a retryable error when rendering fails', async () => {
  (refreshPhotoStamp as jest.Mock).mockRejectedValueOnce(new Error('out of memory'));
  const { result } = renderHook(() => usePhotoNoteController());
  await act(async () => {
    expect(await result.current.saveNote('Keep this note', null, null)).toContain('tap Save to retry');
  });
  expect(usePhotoStore.getState().photos[0].note).toBe('Keep this note');
  expect(usePhotoStore.getState().noteEditingIds).toEqual([photo.id]);
});

it('prevents editing an image already being uploaded', async () => {
  usePhotoStore.setState({ noteEditingIds: [], syncStatus: { [photo.id]: 'syncing' } });
  const { result } = renderHook(() => usePhotoNoteController());
  act(() => result.current.openNote(photo.id));
  expect(usePhotoStore.getState().noteEditingIds).toEqual([]);
  await act(() => result.current.saveNote('Too late', null, null));
  expect(setLocalPhotoNote).not.toHaveBeenCalled();
  expect(refreshPhotoStamp).not.toHaveBeenCalled();
});
