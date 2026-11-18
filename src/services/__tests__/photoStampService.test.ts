import { deleteLocalFiles, keepCaptureFile } from '@/services/localMediaService';
import { renderPhotoStamp } from '@/services/photoStampService';
import { createThumbnail } from '@/services/thumbnailService';
import { Photo } from '@/types/domain';

const mockRender = jest.fn();
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => ({ renderAsync: (...args: unknown[]) => mockRender(...args) }),
}));
jest.mock('@/constants/config', () => ({
  PHOTO_STAMP: { paddingFraction: 0.025, fontFraction: 0.025, lineSpacing: 1.15, jpegQuality: 92 },
  LOCAL_MEDIA: { maxTaskChars: 60 },
}));
jest.mock('@/services/localMediaService', () => ({
  keepCaptureFile: jest.fn(async (_uri: string, _person: string, name: string) => `file:///docs/${name}`),
  deleteLocalFiles: jest.fn(),
}));
jest.mock('@/services/thumbnailService', () => ({ createThumbnail: jest.fn() }));

const photo: Photo = {
  id: 'local-1-test',
  uri: 'file:///old-stamp.jpg',
  personId: 'worker',
  task: 'Inspection',
  lat: 27.7,
  lng: 85.3,
  accuracy: 5,
  takenAt: 1,
  plusCode: 'code',
  synced: false,
  note: 'Final note',
  localStamp: { sourceUri: 'file:///original.jpg', timeLabel: 'capture time', renderedNote: '' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRender.mockResolvedValue({ uri: 'file:///cache/photo-stamp-uuid.jpg', width: 3024, height: 4500 });
  (createThumbnail as jest.Mock).mockResolvedValue('file:///cache/thumb.jpg');
});

it('renders from the untouched original, then creates and persists a thumbnail of the stamped image', async () => {
  const result = await renderPhotoStamp(photo);
  expect(mockRender).toHaveBeenCalledWith(
    photo.localStamp?.sourceUri,
    expect.stringContaining('Note: Final note'),
    expect.anything()
  );
  expect(result.width).toBe(3024);
  expect(result.height).toBe(4500);
  expect(result.uri).toContain('_stamped-uuid.jpg');
  expect(result.localThumbUri).toContain('_stamped-uuid_thumb.jpg');
  expect(createThumbnail).toHaveBeenCalledWith(result.uri);
  expect(result.localStamp).toEqual({ ...photo.localStamp, renderedNote: 'Final note' });
  expect(deleteLocalFiles).not.toHaveBeenCalled();
});

it('does no device work on older images or an already current stamp', async () => {
  const { localStamp: _stamp, ...older } = photo;
  expect(await renderPhotoStamp(older)).toBe(older);
  const current = { ...photo, localStamp: { ...photo.localStamp!, renderedNote: photo.note } };
  expect(await renderPhotoStamp(current)).toBe(current);
  expect(mockRender).not.toHaveBeenCalled();
});

it('cleans up generated files if thumbnail generation fails without deleting the original', async () => {
  (createThumbnail as jest.Mock).mockResolvedValueOnce(null);
  await expect(renderPhotoStamp(photo)).rejects.toThrow('stamped preview');
  const removed = (deleteLocalFiles as jest.Mock).mock.calls[0][0];
  expect(removed).toContain('file:///cache/photo-stamp-uuid.jpg');
  expect(removed).not.toContain(photo.localStamp?.sourceUri);
  expect(removed).not.toContain(photo.uri);
});

it('rejects a native rendering failure without moving or deleting the original', async () => {
  mockRender.mockRejectedValueOnce(new Error('decode failed'));
  await expect(renderPhotoStamp(photo)).rejects.toThrow('decode failed');
  expect(keepCaptureFile).not.toHaveBeenCalled();
  expect(deleteLocalFiles).toHaveBeenCalledWith([]);
});
