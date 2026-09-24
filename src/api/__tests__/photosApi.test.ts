import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { supabase } from '@/api/supabaseClient';
import { Photo } from '@/types/domain';

jest.mock('@/api/firebaseClient', () => ({ firestore: {}, rtdb: {}, auth: {} }));
jest.mock('@/api/supabaseClient', () => ({ supabase: { storage: { from: jest.fn() } } }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ name })),
  query: jest.fn((_coll: unknown, ...constraints: unknown[]) => ({ constraints })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ kind: 'where', field, op, value })),
  orderBy: jest.fn((field: string, dir: string) => ({ kind: 'orderBy', field, dir })),
  limit: jest.fn((n: number) => ({ kind: 'limit', n })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  addDoc: jest.fn(),
}));

describe('fetchPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes the query to a single person when a personId is given', async () => {
    await fetchPhotos('worker-1');

    expect(where).toHaveBeenCalledWith('personId', '==', 'worker-1');
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'photos');
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('leaves the query unscoped for an owner-wide fetch', async () => {
    await fetchPhotos();

    expect(where).not.toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalledWith('takenAt', 'desc');
  });

  it('puts the person filter alongside the ordering in one query', async () => {
    await fetchPhotos('worker-1');

    const constraints = (query as jest.Mock).mock.calls[0].slice(1);
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'where', field: 'personId' }),
        expect.objectContaining({ kind: 'orderBy', field: 'takenAt' }),
      ])
    );
  });
});

const pending: Photo = {
  id: 'local-1',
  uri: 'file:///tmp/a.jpg',
  lat: 27.7,
  lng: 85.3,
  accuracy: 6,
  plusCode: '7JJVXR9R+2X',
  takenAt: 1_700_000_000_000,
  personId: 'worker-1',
  task: 'Column grid L4',
  synced: false,
};

function mockBucket({ uploadError }: { uploadError?: Error } = {}) {
  const upload = jest.fn(async () => ({ error: uploadError ?? null }));
  const getPublicUrl = jest.fn(() => ({ data: { publicUrl: 'https://cdn.example/a.jpg' } }));
  (supabase.storage.from as jest.Mock).mockReturnValue({ upload, getPublicUrl });
  return { upload, getPublicUrl };
}

describe('uploadPhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as never;
  });

  it('writes the file under the owning worker path, then records the metadata', async () => {
    const { upload } = mockBucket();

    await uploadPhotos([pending]);

    expect(upload).toHaveBeenCalledWith('worker-1/local-1.jpg', expect.anything(), {
      contentType: 'image/jpeg',
      upsert: true,
    });
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('stores the public URL rather than the local file path', async () => {
    mockBucket();

    await uploadPhotos([pending]);

    const [, doc] = (addDoc as jest.Mock).mock.calls[0];
    expect(doc.uri).toBe('https://cdn.example/a.jpg');
    expect(doc.synced).toBe(true);
    expect(doc.personId).toBe('worker-1');
  });

  it('uploads a video as an mp4 with the right content type', async () => {
    const { upload } = mockBucket();

    await uploadPhotos([{ ...pending, id: 'local-9', mediaType: 'video', durationMs: 12_000 }]);

    expect(upload).toHaveBeenCalledWith('worker-1/local-9.mp4', expect.anything(), {
      contentType: 'video/mp4',
      upsert: true,
    });
  });

  it('records the clip length for a video', async () => {
    mockBucket();

    await uploadPhotos([{ ...pending, mediaType: 'video', durationMs: 12_000 }]);

    const [, doc] = (addDoc as jest.Mock).mock.calls[0];
    expect(doc.mediaType).toBe('video');
    expect(doc.durationMs).toBe(12_000);
  });

  it('sends no durationMs field for a photo, since Firestore rejects undefined values', async () => {
    mockBucket();

    await uploadPhotos([pending]);

    const [, doc] = (addDoc as jest.Mock).mock.calls[0];
    expect(doc).not.toHaveProperty('durationMs');
    expect(Object.values(doc)).not.toContain(undefined);
  });

  it('treats a record saved before video existed as a photo', async () => {
    const { upload } = mockBucket();
    const legacy: Photo = { ...pending };
    delete legacy.mediaType;

    await uploadPhotos([legacy]);

    expect(upload).toHaveBeenCalledWith('worker-1/local-1.jpg', expect.anything(), {
      contentType: 'image/jpeg',
      upsert: true,
    });
    expect((addDoc as jest.Mock).mock.calls[0][1].mediaType).toBe('photo');
  });

  it('leaves no orphan metadata when the file upload fails', async () => {
    // Firestore would otherwise point at an image that was never stored, and
    // the queue would be marked synced on a photo that does not exist.
    mockBucket({ uploadError: new Error('bucket unreachable') });

    await expect(uploadPhotos([pending])).rejects.toThrow('bucket unreachable');
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('stops on the first failure instead of pressing on through the batch', async () => {
    mockBucket({ uploadError: new Error('bucket unreachable') });

    await expect(uploadPhotos([pending, { ...pending, id: 'local-2' }])).rejects.toThrow();
    expect(supabase.storage.from).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an empty queue', async () => {
    mockBucket();

    await uploadPhotos([]);

    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });
});
