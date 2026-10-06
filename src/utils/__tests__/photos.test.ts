import { Photo } from '@/types/domain';
import {
  captureFileName,
  mergeById,
  mergePhotoLists,
  newLocalPhotoId,
  photoFromCaptureFileName,
} from '@/utils/photos';

function photo(overrides: Partial<Photo>): Photo {
  return {
    id: 'local-1700000000000-abc123',
    uri: 'file:///docs/a.jpg',
    mediaType: 'photo',
    lat: 27.717245,
    lng: 85.323961,
    accuracy: 6.4,
    plusCode: '7JJQPJ89+VH',
    takenAt: 1_700_000_000_000,
    personId: 'zNR7yZ1UFjaW75NlMuSr2dYP3d82',
    task: 'Column grid L4',
    synced: false,
    ...overrides,
  };
}

describe('newLocalPhotoId', () => {
  it('gives two captures in the same millisecond distinct ids', () => {
    expect(newLocalPhotoId(1)).not.toBe(newLocalPhotoId(1));
  });
});

describe('capture file names', () => {
  it('round-trips everything the Photos list needs', () => {
    const original = photo({});
    const name = captureFileName(original);

    const recovered = photoFromCaptureFileName({ filename: name, uri: 'file:///gallery/x.jpg' });

    expect(recovered).toEqual({
      ...original,
      uri: 'file:///gallery/x.jpg',
      plusCode: expect.any(String),
    });
  });

  it('round-trips a video with its duration', () => {
    const name = captureFileName(photo({ mediaType: 'video', durationMs: 12_000 }));
    expect(name.endsWith('.mp4')).toBe(true);

    const recovered = photoFromCaptureFileName({
      filename: name,
      uri: 'file:///g/v.mp4',
      durationMs: 12_000,
    });

    expect(recovered?.mediaType).toBe('video');
    expect(recovered?.durationMs).toBe(12_000);
  });

  it('handles southern/western coordinates and ids containing underscores', () => {
    const original = photo({ lat: -33.8688, lng: -151.2093, personId: 'dev_worker_1' });

    const recovered = photoFromCaptureFileName({ filename: captureFileName(original), uri: 'u' });

    expect(recovered).toMatchObject({ lat: -33.8688, lng: -151.2093, personId: 'dev_worker_1' });
  });

  it('strips characters a file name cannot hold from the task', () => {
    const name = captureFileName(photo({ task: 'Slab/L4: "east"_bay?' }));

    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    expect(photoFromCaptureFileName({ filename: name, uri: 'u' })?.task).toBe('Slab L4 east bay');
  });

  it('keeps a task in a non-Latin script', () => {
    const name = captureFileName(photo({ task: 'स्तम्भ ढलान' }));

    expect(photoFromCaptureFileName({ filename: name, uri: 'u' })?.task).toBe('स्तम्भ ढलान');
  });

  it('ignores files it did not name', () => {
    expect(photoFromCaptureFileName({ filename: 'IMG_20260925_101500.jpg', uri: 'u' })).toBeNull();
  });
});

describe('mergeById', () => {
  it('adds only entries the base list does not already have, base winning', () => {
    const base = [photo({ id: 'a', task: 'saved' })];
    const extra = [photo({ id: 'a', task: 'recovered' }), photo({ id: 'b' })];

    const merged = mergeById(base, extra);

    expect(merged.map(p => [p.id, p.task])).toEqual([
      ['a', 'saved'],
      ['b', 'Column grid L4'],
    ]);
  });
});

describe('mergePhotoLists', () => {
  it('shows a capture the backend also has once, from the local file, marked synced', () => {
    const local = [photo({ id: 'local-1', uri: 'file:///docs/a.jpg', takenAt: 5 })];
    const remote = [photo({ id: 'firestore-9', uri: 'https://cdn/a.jpg', takenAt: 5, synced: true })];

    const merged = mergePhotoLists(local, remote);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'local-1', uri: 'file:///docs/a.jpg', synced: true });
  });

  it('keeps backend-only photos and sorts newest first', () => {
    const local = [photo({ id: 'l', takenAt: 2 })];
    const remote = [photo({ id: 'r-new', takenAt: 3 }), photo({ id: 'r-old', takenAt: 1 })];

    expect(mergePhotoLists(local, remote).map(p => p.id)).toEqual(['r-new', 'l', 'r-old']);
  });
});
