import { getDoc, updateDoc } from 'firebase/firestore';

import { fetchSite, updateGeofenceRadius } from '@/api/siteApi';

jest.mock('@/api/firebaseClient', () => ({ firestore: {}, rtdb: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: jest.fn(),
  updateDoc: jest.fn(async () => undefined),
}));

describe('fetchSite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the configured site', async () => {
    const site = { name: 'Kathmandu Demo Site', lat: 27.7172, lng: 85.324, radius: 150 };
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => site });

    expect(await fetchSite()).toEqual(site);
  });

  it('fails with an actionable message when the site document is missing', async () => {
    // Every owner screen waits on this, so a silent null would hang them all
    // on a spinner with no clue that seeding never ran.
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

    await expect(fetchSite()).rejects.toThrow('sites/default');
  });

  it('reads the single fixed site document', async () => {
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({}) });

    await fetchSite();

    expect(getDoc).toHaveBeenCalledWith({ collection: 'sites', id: 'default' });
  });
});

describe('updateGeofenceRadius', () => {
  beforeEach(() => jest.clearAllMocks());

  it('patches only the radius field', async () => {
    await updateGeofenceRadius(220);

    expect(updateDoc).toHaveBeenCalledWith({ collection: 'sites', id: 'default' }, { radius: 220 });
  });
});
