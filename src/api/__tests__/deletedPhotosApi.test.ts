import { collection, getDocs, where } from 'firebase/firestore';

import { fetchDeletedPhotos } from '@/api/deletedPhotosApi';

jest.mock('@/api/firebaseClient', () => ({ firestore: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ name })),
  query: jest.fn((_coll: unknown, ...constraints: unknown[]) => ({ constraints })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

describe('fetchDeletedPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it("asks only for this person's deletion notes, as the security rules require", async () => {
    await fetchDeletedPhotos('worker-1');

    expect(collection).toHaveBeenCalledWith(expect.anything(), 'deletedPhotos');
    expect(where).toHaveBeenCalledWith('personId', '==', 'worker-1');
  });

  it('returns the deleted record id with who took it and when', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [{ id: 'rec-1', data: () => ({ personId: 'worker-1', takenAt: 5, deletedAt: 99 }) }],
    });

    expect(await fetchDeletedPhotos('worker-1')).toEqual([{ id: 'rec-1', personId: 'worker-1', takenAt: 5 }]);
  });
});
