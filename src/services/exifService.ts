import { File } from 'expo-file-system';
// piexifjs has no bundled types; declared ambiently in src/types/piexifjs.d.ts.
import piexif from 'piexifjs';

import { GeoPoint } from '@/types/domain';

interface GeotagOptions extends GeoPoint {
  altitude?: number;
  takenAt?: Date;
}

/**
 * The photo's own EXIF with our GPS added — not a fresh block holding only GPS.
 * Replacing the whole block would throw away Orientation (the phone stores a
 * portrait shot sideways and relies on that tag to display it upright), plus
 * the camera model, exposure and timestamp.
 */
function buildExifBytes(jpegData: string, gps: Record<number, unknown>): string {
  let existing: ReturnType<typeof piexif.load> = {};
  try {
    existing = piexif.load(jpegData);
  } catch {
    // No EXIF block yet, or one piexifjs can't read: start from GPS alone.
    existing = {};
  }

  try {
    return piexif.dump({ ...existing, GPS: gps });
  } catch {
    // Some phone makers write tags piexifjs cannot serialise back. Keep the one
    // tag that changes how the picture looks, and let the rest go.
    const orientation = existing['0th']?.[piexif.ImageIFD.Orientation];
    return piexif.dump({
      '0th': orientation != null ? { [piexif.ImageIFD.Orientation]: orientation } : {},
      GPS: gps,
    });
  }
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
  const base64 = await new File(uri).base64();
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

  const exifBytes = buildExifBytes(jpegData, gps);
  const newData = piexif.insert(exifBytes, jpegData);
  const newBase64 = newData.split(',')[1];

  const outFile = new File(uri.replace(/\.jpe?g$/i, '') + '-geo.jpg');
  // create() throws if the file already exists, so overwrite explicitly —
  // re-tagging the same capture must replace the earlier -geo copy.
  outFile.create({ overwrite: true });
  outFile.write(newBase64, { encoding: 'base64' });
  return outFile.uri;
}
