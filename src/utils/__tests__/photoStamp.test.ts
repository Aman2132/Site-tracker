import { Photo } from '@/types/domain';
import { needsPhotoStamp, photoStampText, photoStampTime } from '@/utils/photoStamp';

const photo: Photo = {
  id: 'local-1-test',
  uri: 'file:///original.jpg',
  personId: 'worker',
  task: 'Inspection',
  lat: -27.717245,
  lng: 85.323961,
  accuracy: 6.4,
  takenAt: Date.UTC(2026, 10, 18, 8, 47, 10),
  plusCode: 'code',
  synced: false,
};

it('formats the local capture time without displaying the Nepal offset', () => {
  expect(photoStampTime(photo.takenAt, 345)).toBe('2026-11-18 14:32:10');
});

it('handles negative offsets and crossing the date boundary', () => {
  expect(photoStampTime(Date.UTC(2026, 0, 1, 1), -300)).toBe('2025-12-31 20:00:00');
});

it('includes signed coordinates, multiline Unicode notes and the frozen capture time without accuracy', () => {
  const text = photoStampText({
    ...photo,
    note: 'Concrete inspection\nनेपाल ✓',
    localStamp: { sourceUri: photo.uri, timeLabel: 'frozen capture time' },
  });
  expect(text).toContain('GPS: -27.717245, 85.323961');
  expect(text).not.toContain('Accuracy');
  expect(text).toContain('Time: frozen capture time');
  expect(text).toContain('Note: Concrete inspection\nनेपाल ✓');
});

it('omits offsets from previously saved local capture labels when restamping', () => {
  const text = photoStampText({
    ...photo,
    localStamp: { sourceUri: photo.uri, timeLabel: '2026-11-18 14:32:10 +05:45' },
  });
  expect(text).toContain('Date: 2026-11-18\nTime: 14:32:10');
  expect(text).not.toContain('+05:45');
});

it('shows new capture date and time on separate labelled lines', () => {
  const text = photoStampText({
    ...photo,
    localStamp: { sourceUri: photo.uri, timeLabel: photoStampTime(photo.takenAt, 345) },
  });
  expect(text).toContain('Date: 2026-11-18\nTime: 14:32:10');
});

it('does not opt older photos or videos into stamping', () => {
  expect(needsPhotoStamp(photo)).toBe(false);
  expect(
    needsPhotoStamp({ ...photo, mediaType: 'video', localStamp: { sourceUri: photo.uri, timeLabel: 'time' } })
  ).toBe(false);
});

it('renders new captures even without a note and rerenders when a note changes or is removed', () => {
  const initial = { ...photo, localStamp: { sourceUri: photo.uri, timeLabel: 'time' } };
  expect(needsPhotoStamp(initial)).toBe(true);
  expect(photoStampText(initial)).toContain('Note: No note');
  const rendered = { ...initial, localStamp: { ...initial.localStamp, renderedNote: '' } };
  expect(needsPhotoStamp(rendered)).toBe(false);
  expect(needsPhotoStamp({ ...rendered, note: 'Updated' })).toBe(true);
  expect(
    needsPhotoStamp({ ...rendered, localStamp: { ...rendered.localStamp, renderedNote: 'Removed note' } })
  ).toBe(true);
});
