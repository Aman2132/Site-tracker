import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';

const capture = {
  uri: 'file:///tmp/shot.jpg',
  lat: 27.7172,
  lng: 85.324,
  accuracy: 6,
  plusCode: '7JJVXR9R+2X',
  takenAt: 1_700_000_000_000,
  personId: 'worker-1',
  task: 'Column grid L4',
};

describe('usePhotoStore', () => {
  beforeEach(() => usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null }));

  it('gives two captures in the same millisecond distinct ids', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    usePhotoStore.getState().addPhoto(capture);
    usePhotoStore.getState().addPhoto(capture);

    const [first, second] = usePhotoStore.getState().photos;
    expect(first.id).not.toBe(second.id);

    clock.mockRestore();
  });

  it('queues new captures unsynced and newest-first', () => {
    usePhotoStore.getState().addPhoto({ ...capture, task: 'older' });
    usePhotoStore.getState().addPhoto({ ...capture, task: 'newer' });

    const { photos } = usePhotoStore.getState();
    expect(photos.map(p => p.task)).toEqual(['newer', 'older']);
    expect(photos.every(p => !p.synced)).toBe(true);
  });

  it('records whose photos are loaded, so a second person on the same handset reloads', () => {
    const loaded = [{ ...capture, id: 'p1', synced: true }];

    usePhotoStore.getState().setPhotos(loaded, 'worker-1');
    expect(usePhotoStore.getState().loadedFor).toBe('worker-1');

    // worker-2 signing in on this device must not match, or the controller
    // would keep showing worker-1's list.
    expect(usePhotoStore.getState().loadedFor).not.toBe('worker-2');
  });

  it('reports only unsynced photos as pending', () => {
    usePhotoStore.getState().addPhoto(capture);
    expect(selectPendingPhotos(usePhotoStore.getState())).toHaveLength(1);

    usePhotoStore.getState().markAllSynced();
    expect(selectPendingPhotos(usePhotoStore.getState())).toHaveLength(0);
  });
});
