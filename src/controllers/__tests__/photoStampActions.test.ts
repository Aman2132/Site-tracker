import { refreshPhotoStamp } from '@/controllers/photoStampActions';
import { deleteLocalFiles } from '@/services/localMediaService';
import { setLocalPhotoMedia } from '@/services/photoQueueStorage';
import { renderPhotoStamp } from '@/services/photoStampService';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';

jest.mock('@/services/localMediaService', () => ({ deleteLocalFiles: jest.fn() }));
jest.mock('@/services/photoQueueStorage', () => ({ setLocalPhotoMedia: jest.fn(async () => undefined) }));
jest.mock('@/services/photoStampService', () => ({ renderPhotoStamp: jest.fn() }));

const original: Photo = {
  id: 'local-1-test',
  uri: 'file:///original.jpg',
  personId: 'worker',
  task: 'Inspection',
  lat: 27.7,
  lng: 85.3,
  accuracy: 5,
  takenAt: 1,
  plusCode: 'code',
  synced: false,
  localStamp: { sourceUri: 'file:///original.jpg', timeLabel: 'capture time' },
};

beforeEach(() => {
  jest.clearAllMocks();
  usePhotoStore.getState().clear();
  usePhotoStore.getState().addPhoto(original);
  (setLocalPhotoMedia as jest.Mock).mockResolvedValue(undefined);
  (renderPhotoStamp as jest.Mock).mockImplementation(async (p: Photo) => ({
    ...p,
    uri: 'file:///stamped.jpg',
    localThumbUri: 'file:///stamped_thumb.jpg',
    width: 100,
    height: 180,
    localStamp: { ...p.localStamp, renderedNote: p.note ?? '' },
  }));
});

it('commits the stamped image and dimensions, retains the original and reuses a completed stamp', async () => {
  const stamped = await refreshPhotoStamp(original);
  expect(setLocalPhotoMedia).toHaveBeenCalledWith('worker', original.id, stamped);
  expect(usePhotoStore.getState().photos[0]).toEqual(stamped);
  expect(deleteLocalFiles).toHaveBeenCalledWith([undefined]);
  await refreshPhotoStamp(stamped);
  expect(renderPhotoStamp).toHaveBeenCalledTimes(1);
});

it('leaves older and synced photos untouched', async () => {
  const { localStamp: _stamp, ...older } = original;
  usePhotoStore.setState({ photos: [older] });
  expect(await refreshPhotoStamp(older)).toEqual(older);
  const synced = { ...original, synced: true };
  usePhotoStore.setState({ photos: [synced] });
  expect(await refreshPhotoStamp(synced)).toEqual(synced);
  expect(renderPhotoStamp).not.toHaveBeenCalled();
});

it('regenerates from the same original when a note is edited, and deletes only old derivatives', async () => {
  await refreshPhotoStamp(original);
  usePhotoStore.getState().setNote(original.id, 'Final inspection');
  await refreshPhotoStamp(original);
  expect(renderPhotoStamp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      note: 'Final inspection',
      localStamp: expect.objectContaining({ sourceUri: original.uri }),
    })
  );
  expect(deleteLocalFiles).toHaveBeenLastCalledWith(['file:///stamped.jpg', 'file:///stamped_thumb.jpg']);
});

it('retains current files on renderer failure and allows a successful retry', async () => {
  (renderPhotoStamp as jest.Mock).mockRejectedValueOnce(new Error('renderer failed'));
  await expect(refreshPhotoStamp(original)).rejects.toThrow('renderer failed');
  expect(setLocalPhotoMedia).not.toHaveBeenCalled();
  expect(deleteLocalFiles).not.toHaveBeenCalled();
  expect(usePhotoStore.getState().photos[0]).toEqual(original);
  await refreshPhotoStamp(original);
  expect(usePhotoStore.getState().photos[0].uri).toBe('file:///stamped.jpg');
});

it('retains referenced originals and cleans up new files when SQLite persistence fails', async () => {
  (setLocalPhotoMedia as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(refreshPhotoStamp(original)).rejects.toThrow('disk full');
  expect(usePhotoStore.getState().photos[0]).toEqual(original);
  expect(deleteLocalFiles).toHaveBeenCalledTimes(1);
  expect(deleteLocalFiles).toHaveBeenCalledWith(['file:///stamped.jpg', 'file:///stamped_thumb.jpg']);
});

it('serializes simultaneous requests for the same photo', async () => {
  await Promise.all([refreshPhotoStamp(original), refreshPhotoStamp(original)]);
  expect(renderPhotoStamp).toHaveBeenCalledTimes(1);
  expect(setLocalPhotoMedia).toHaveBeenCalledTimes(1);
});
