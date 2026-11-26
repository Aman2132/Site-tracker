import { UploadType } from 'expo-file-system';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { auth } from '@/api/firebaseClient';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { PHOTO_UPLOAD } from '@/constants/config';
import { Photo } from '@/types/domain';

jest.mock('@/api/firebaseClient', () => ({
  firestore: {},
  auth: { currentUser: { uid: 'worker-1', getIdToken: jest.fn(async () => 'firebase-id-token') } },
}));

const mockNativeUpload = jest.fn();
jest.mock('expo-file-system', () => ({
  UploadType: { BINARY_CONTENT: 0 },
  File: class {
    private readonly uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return !this.uri.endsWith('/missing.jpg');
    }
    get size() {
      return this.uri.endsWith('_thumb.jpg') ? 3 : 8;
    }
    upload(url: string, options: unknown) {
      return mockNativeUpload(this.uri, url, options);
    }
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ name })),
  query: jest.fn((_coll: unknown, ...constraints: unknown[]) => ({ constraints })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ kind: 'where', field, op, value })),
  orderBy: jest.fn((field: string, dir: string) => ({ kind: 'orderBy', field, dir })),
  limit: jest.fn((n: number) => ({ kind: 'limit', n })),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

describe('fetchPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes the query to one worker and retains the capture ordering', async () => {
    await fetchPhotos('worker-1');

    expect(where).toHaveBeenCalledWith('personId', '==', 'worker-1');
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'photos');
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect((query as jest.Mock).mock.calls[0].slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'where', field: 'personId' }),
        expect.objectContaining({ kind: 'orderBy', field: 'takenAt' }),
      ])
    );
  });

  it('leaves the query unscoped for an owner-wide fetch', async () => {
    await fetchPhotos();

    expect(where).not.toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalledWith('takenAt', 'desc');
  });

  it('keeps both Supabase and R2 references from legacy and new records', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [
        {
          id: 'old',
          data: () => ({ uri: 'https://example.supabase.co/storage/v1/object/public/Photos/old.jpg' }),
        },
        {
          id: 'new',
          data: () => ({
            uri: 'https://photos.example.r2.dev/new.jpg',
            thumbUrl: 'https://photos.example.r2.dev/new_thumb.jpg',
          }),
        },
      ],
    });
    expect(await fetchPhotos()).toEqual([
      { id: 'old', uri: 'https://example.supabase.co/storage/v1/object/public/Photos/old.jpg' },
      {
        id: 'new',
        uri: 'https://photos.example.r2.dev/new.jpg',
        thumbUrl: 'https://photos.example.r2.dev/new_thumb.jpg',
      },
    ]);
  });
});

const pending: Photo = {
  id: 'local-1700000000000-jpg123',
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
const thumbUri = 'file:///tmp/a_thumb.jpg';
const endpoint = PHOTO_UPLOAD.apiOrigin.replace(/\/+$/, '') + PHOTO_UPLOAD.endpoint;
const originalUrl = 'https://example.r2.cloudflarestorage.com/photos/a.jpg?signature=example';
const thumbUrl = 'https://example.r2.cloudflarestorage.com/photos/a_thumb.jpg?signature=example';
const signedHeaders = (bytes: number, type = 'image/jpeg') => ({
  'Content-Type': type,
  'Content-Length': String(bytes),
  'If-None-Match': '*',
});

function fakeResponse(status: number, payload?: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => payload } as Response;
}

function mockUpload({
  originalStatus = 200,
  thumbnailStatus = 200,
  completeStatus = 200,
  alreadyComplete = false,
  uploadWindow = 100,
}: {
  originalStatus?: number;
  thumbnailStatus?: number;
  completeStatus?: number;
  alreadyComplete?: boolean;
  uploadWindow?: number;
} = {}) {
  const requests: Record<string, unknown>[] = [];
  const trace: string[] = [];
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === endpoint) {
      trace.push(url);
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      requests.push(request);
      if (request.action === 'complete') return fakeResponse(completeStatus, { completed: true });
      if (alreadyComplete) return fakeResponse(200, { completed: true });
      return fakeResponse(200, {
        uploadWindow,
        original: {
          url: originalUrl,
          headers: signedHeaders(8, request.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        },
        ...(request.thumbnailBytes ? { thumbnail: { url: thumbUrl, headers: signedHeaders(3) } } : {}),
      });
    }
    throw new Error('Unexpected request');
  });
  mockNativeUpload.mockImplementation(async (_uri: string, url: string) => {
    trace.push(url);
    if (url === originalUrl) return { status: originalStatus };
    if (url === thumbUrl) return { status: thumbnailStatus };
    throw new Error('Unexpected upload');
  });
  globalThis.fetch = fetchMock as typeof fetch;
  return { requests, fetchMock, trace };
}

describe('uploadPhotos', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = realFetch;
  });

  it.each(['http://127.0.0.1:3000', 'http://192.168.1.75:3000'])(
    'routes a debug upload through %s',
    async origin => {
      jest.replaceProperty(PHOTO_UPLOAD, 'apiOrigin', origin);
      const fetchMock = jest.fn(async () => fakeResponse(200, { completed: true }));
      globalThis.fetch = fetchMock as typeof fetch;

      await uploadPhotos([pending]);

      expect(fetchMock).toHaveBeenCalledWith(
        origin + '/api/photos/upload',
        expect.objectContaining({ method: 'POST' })
      );
    }
  );

  it.each(['http://203.0.113.10:3000', 'http://010.1.2.3:3000'])(
    'rejects public or ambiguous HTTP address %s before sending a token',
    async origin => {
      jest.replaceProperty(PHOTO_UPLOAD, 'apiOrigin', origin);
      const { fetchMock } = mockUpload();

      await expect(uploadPhotos([pending])).rejects.toThrow('Android debug build');
      expect(auth.currentUser?.getIdToken).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('rejects a local HTTP dashboard in a release build before sending a token', async () => {
    jest.replaceProperty(PHOTO_UPLOAD, 'apiOrigin', 'http://127.0.0.1:3000');
    jest.replaceProperty(globalThis as typeof globalThis & { __DEV__: boolean }, '__DEV__', false);
    const { fetchMock } = mockUpload();

    await expect(uploadPhotos([pending])).rejects.toThrow('Android debug build');
    expect(auth.currentUser?.getIdToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates only the dashboard, PUTs both binary files, and sends safe metadata last', async () => {
    const { requests, fetchMock, trace } = mockUpload();
    await uploadPhotos(
      [
        {
          ...pending,
          altitude: 1350,
          heading: 121,
          personName: 'Team member',
          note: 'Pouring slab',
          siteId: 'site-1',
          inventoryId: 'entry-2',
          width: 3024,
          height: 4032,
          localThumbUri: thumbUri,
          localStamp: {
            sourceUri: 'file:///tmp/unstamped.jpg',
            timeLabel: '2026-11-26',
            renderedNote: 'Pouring slab',
          },
        },
      ],
      { [pending.id]: thumbUri }
    );

    expect(trace).toEqual([endpoint, originalUrl, thumbUrl, endpoint]);
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer firebase-id-token', 'Content-Type': 'application/json' },
      })
    );
    expect(mockNativeUpload).toHaveBeenCalledWith(pending.uri, originalUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: signedHeaders(8),
    });
    expect(mockNativeUpload).toHaveBeenCalledWith(thumbUri, thumbUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: signedHeaders(3),
    });
    expect(requests[0]).toEqual({
      action: 'prepare',
      captureId: pending.id,
      mediaType: 'photo',
      originalBytes: 8,
      thumbnailBytes: 3,
      revision: 'Pouring slab',
    });
    expect(requests[1]).toEqual({
      ...requests[0],
      action: 'complete',
      uploadWindow: 100,
      photo: {
        lat: 27.7,
        lng: 85.3,
        accuracy: 6,
        altitude: 1350,
        heading: 121,
        plusCode: '7JJVXR9R+2X',
        takenAt: pending.takenAt,
        task: pending.task,
        personName: 'Team member',
        note: 'Pouring slab',
        siteId: 'site-1',
        inventoryId: 'entry-2',
        width: 3024,
        height: 4032,
      },
    });
  });

  it('uploads a legacy video as MP4 and keeps its duration without requesting a thumbnail', async () => {
    const { requests } = mockUpload();
    await uploadPhotos([{ ...pending, mediaType: 'video', durationMs: 12_000 }], { [pending.id]: thumbUri });

    expect(mockNativeUpload).toHaveBeenCalledWith(pending.uri, originalUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: signedHeaders(8, 'video/mp4'),
    });
    expect(mockNativeUpload).toHaveBeenCalledTimes(1);
    expect(requests[0]).toMatchObject({ mediaType: 'video' });
    expect(requests[0]).not.toHaveProperty('thumbnailBytes');
    expect(requests[1].photo).toMatchObject({ durationMs: 12_000 });
  });

  it('skips all PUTs and finalization when prepare returns completed', async () => {
    const { requests } = mockUpload({ alreadyComplete: true });
    await uploadPhotos([pending]);
    expect(mockNativeUpload).not.toHaveBeenCalled();
    expect(requests.map(request => request.action)).toEqual(['prepare']);
  });

  it('finalizes when a retry finds the original already uploaded', async () => {
    const { requests } = mockUpload({ originalStatus: 412 });
    await uploadPhotos([pending], { [pending.id]: thumbUri });
    expect(mockNativeUpload).toHaveBeenCalledWith(thumbUri, thumbUrl, expect.anything());
    expect(requests.map(request => request.action)).toEqual(['prepare', 'complete']);
  });

  it('keeps a changed stamp separate from an unfinished previous upload', async () => {
    const { requests } = mockUpload({ completeStatus: 503 });
    const draft = {
      ...pending,
      localStamp: { sourceUri: pending.uri, timeLabel: '2026-11-26', renderedNote: 'Draft' },
    };
    await expect(uploadPhotos([draft])).rejects.toThrow('503');
    const reply = mockUpload({ uploadWindow: 101 });
    await uploadPhotos([{ ...draft, localStamp: { ...draft.localStamp, renderedNote: 'Final' } }]);
    expect(requests[0].revision).toBe('Draft');
    expect(reply.requests[0].revision).toBe('Final');
    expect(reply.requests[1]).toMatchObject({ revision: 'Final', uploadWindow: 101 });
  });

  it('does not finalize or advance to other captures when a storage request fails', async () => {
    const { requests } = mockUpload({ thumbnailStatus: 403 });
    await expect(
      uploadPhotos([pending, { ...pending, id: 'local-1700000000001-next' }], {
        [pending.id]: thumbUri,
      })
    ).rejects.toThrow('403');
    expect(requests.map(request => request.action)).toEqual(['prepare']);
  });

  it('rejects a missing or invalid upload window before uploading to R2', async () => {
    mockUpload({ uploadWindow: -1 });
    await expect(uploadPhotos([pending])).rejects.toThrow('invalid upload window');
    expect(mockNativeUpload).not.toHaveBeenCalled();
  });

  it('keeps a missing local file queued without requesting signed targets', async () => {
    const { fetchMock } = mockUpload();
    await expect(uploadPhotos([{ ...pending, uri: 'file:///tmp/missing.jpg' }])).rejects.toThrow(
      'saved capture'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not sync a different person’s capture under the current Firebase account', async () => {
    const { requests } = mockUpload();
    await expect(uploadPhotos([{ ...pending, personId: 'another-worker' }])).rejects.toThrow(
      'person who took this photo'
    );
    expect(auth.currentUser?.getIdToken).not.toHaveBeenCalled();
    expect(requests).toEqual([]);
  });

  it('does nothing for an empty queue', async () => {
    const { fetchMock } = mockUpload();
    await uploadPhotos([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
