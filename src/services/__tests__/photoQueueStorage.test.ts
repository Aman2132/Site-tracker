import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadQueuedPhotos, saveQueuedPhotos } from '@/services/photoQueueStorage';
import { Photo } from '@/types/domain';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const photo: Photo = {
  id: 'local-1',
  uri: 'file:///tmp/a.jpg',
  lat: 27.7,
  lng: 85.3,
  accuracy: 6,
  plusCode: '7JJVXR9R+2X',
  takenAt: 1,
  personId: 'worker-1',
  task: 'Task',
  synced: false,
};

describe('loadQueuedPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null on a fresh install with nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    expect(await loadQueuedPhotos()).toBeNull();
  });

  it('returns null rather than throwing when the stored queue is corrupt', async () => {
    // A half-written file after a crash mid-save would look like this. Losing
    // the queue is bad; crashing the app on every launch is worse.
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{"photos":[{oh no');

    expect(await loadQueuedPhotos()).toBeNull();
  });

  it('treats an empty stored string as nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('');

    expect(await loadQueuedPhotos()).toBeNull();
  });

  it('round-trips a stored queue', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([photo]));

    expect(await loadQueuedPhotos()).toEqual([photo]);
  });
});

describe('saveQueuedPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serializes the queue under a stable key', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await saveQueuedPhotos([photo]);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('photoQueue', JSON.stringify([photo]));
  });

  it('does not reject when the device write fails', async () => {
    // This runs from a store subscription on every queue change — an
    // unhandled rejection here would surface as a redbox mid-capture.
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'));

    await expect(saveQueuedPhotos([photo])).resolves.toBeUndefined();
  });
});
