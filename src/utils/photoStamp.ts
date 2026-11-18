import { Photo } from '@/types/domain';

/** Freeze the capture's local time AND UTC offset; never use the later upload/edit time. */
export function photoStampTime(
  takenAt: number,
  offsetMinutes = -new Date(takenAt).getTimezoneOffset()
): string {
  const local = new Date(takenAt + offsetMinutes * 60_000).toISOString().slice(0, 19).replace('T', ' ');
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${local} ${offsetMinutes >= 0 ? '+' : '-'}${hours}:${minutes}`;
}

export function photoStampText(photo: Photo): string {
  return [
    `GPS: ${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)} | Accuracy: +/-${Math.round(photo.accuracy)} m`,
    `Taken: ${photo.localStamp?.timeLabel ?? photoStampTime(photo.takenAt)}`,
    `Note: ${photo.note?.trim() || 'No note'}`,
  ].join('\n');
}

export function needsPhotoStamp(photo: Photo): boolean {
  return (
    !!photo.localStamp && photo.mediaType !== 'video' && photo.localStamp.renderedNote !== (photo.note ?? '')
  );
}
