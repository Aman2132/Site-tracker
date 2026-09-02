import * as FileSystem from 'expo-file-system';
// piexifjs has no bundled types; declared ambiently in src/types/piexifjs.d.ts.
import piexif from 'piexifjs';

import { GeoPoint } from '@/types/domain';

interface GeotagOptions extends GeoPoint {
  altitude?: number;
  takenAt?: Date;
}

/**
 * Burns GPS coordinates into a JPEG's EXIF at capture time, fully offline —
 * this is a local metadata write, not a network call. Returns the new file's
 * URI (original is left untouched).
 */
export async function writeGeotag(
  uri: string,
  { lat, lng, altitude = 0, takenAt = new Date() }: GeotagOptions
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const jpegData = 'data:image/jpeg;base64,' + base64;

  const toDms = (deg: number): [number, number][] => {
    const abs = Math.abs(deg);
    const wholeDegrees = Math.floor(abs);
    const minutesFloat = (abs - wholeDegrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60 * 100);
    return [
      [wholeDegrees, 1],
      [minutes, 1],
      [seconds, 100],
    ];
  };

  const gps = {
    [piexif.GPSIFD.GPSLatitudeRef]: lat >= 0 ? 'N' : 'S',
    [piexif.GPSIFD.GPSLatitude]: toDms(lat),
    [piexif.GPSIFD.GPSLongitudeRef]: lng >= 0 ? 'E' : 'W',
    [piexif.GPSIFD.GPSLongitude]: toDms(lng),
    [piexif.GPSIFD.GPSAltitude]: [[Math.round(altitude), 1]],
    [piexif.GPSIFD.GPSTimeStamp]: [
      [takenAt.getUTCHours(), 1],
      [takenAt.getUTCMinutes(), 1],
      [takenAt.getUTCSeconds(), 1],
    ],
  };

  const exifBytes = piexif.dump({ GPS: gps });
  const newData = piexif.insert(exifBytes, jpegData);
  const newBase64 = newData.split(',')[1];

  const outUri = uri.replace(/\.jpe?g$/i, '') + '-geo.jpg';
  await FileSystem.writeAsStringAsync(outUri, newBase64, { encoding: FileSystem.EncodingType.Base64 });
  return outUri;
}
