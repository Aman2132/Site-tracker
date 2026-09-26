import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';

const capture: Photo = {
  id: 'local-1700000000000-abc123',
  uri: 'file:///tmp/shot.jpg',
  lat: 27.7172,
  lng: 85.324,
  accuracy: 6,
  plusCode: '7JJVXR9R+2X',
  takenAt: 1_700_000_000_000,
  personId: 'worker-1',
  task: 'Column grid L4',
  synced: false,
};

describe('usePhotoStore', () => {
  beforeEach(() => usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null }));

  it('puts new captures on top', () => {
    usePhotoStore.getState().addPhoto({ ...capture, id: 'a', task: 'older' });
    usePhotoStore.getState().addPhoto({ ...capture, id: 'b', task: 'newer' });

    expect(usePhotoStore.getState().photos.map(p => p.task)).toEqual(['newer', 'older']);
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
