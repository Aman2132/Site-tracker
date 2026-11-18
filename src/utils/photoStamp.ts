import { Photo } from '@/types/domain';

/** Freeze the capture's local date and time; never use the later upload/edit time. */
export function photoStampTime(
  takenAt: number,
  offsetMinutes = -new Date(takenAt).getTimezoneOffset()
): string {
  return new Date(takenAt + offsetMinutes * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

export function photoStampText(photo: Photo): string {
  const label = (photo.localStamp?.timeLabel ?? photoStampTime(photo.takenAt)).replace(/\s[+-]\d{2}:\d{2}$/, '');
  const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/.exec(label);
  return [
    `GPS: ${photo.lat.toFixed(6)}, ${photo.lng.toFixed(6)}`,
    ...(match ? [`Date: ${match[1]}`, `Time: ${match[2]}`] : [`Time: ${label}`]),
    `Note: ${photo.note?.trim() || 'No note'}`,
  ].join('\n');
}

export function needsPhotoStamp(photo: Photo): boolean {
  return (
    !!photo.localStamp && photo.mediaType !== 'video' && photo.localStamp.renderedNote !== (photo.note ?? '')
  );
}
