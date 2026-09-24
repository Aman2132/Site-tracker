import * as FileSystem from 'expo-file-system';
import piexif from 'piexifjs';

import { writeGeotag } from '@/services/exifService';

jest.mock('expo-file-system', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(async () => 'BASE64DATA'),
  writeAsStringAsync: jest.fn(async () => undefined),
}));

jest.mock('piexifjs', () => ({
  __esModule: true,
  default: {
    GPSIFD: {
      GPSLatitudeRef: 'latRef',
      GPSLatitude: 'lat',
      GPSLongitudeRef: 'lngRef',
      GPSLongitude: 'lng',
      GPSAltitude: 'alt',
      GPSTimeStamp: 'time',
    },
    dump: jest.fn(() => 'EXIFBYTES'),
    insert: jest.fn(() => 'data:image/jpeg;base64,TAGGED'),
  },
}));

function dumpedGps() {
  return (piexif.dump as jest.Mock).mock.calls[0][0].GPS;
}

describe('writeGeotag hemispheres', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tags the northern and eastern hemispheres for Kathmandu', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7172, lng: 85.324 });

    expect(dumpedGps().latRef).toBe('N');
    expect(dumpedGps().lngRef).toBe('E');
  });

  it('tags the southern hemisphere for a negative latitude', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: -33.8688, lng: 151.2093 });

    expect(dumpedGps().latRef).toBe('S');
    expect(dumpedGps().lngRef).toBe('E');
  });

  it('tags the western hemisphere for a negative longitude', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: 40.7128, lng: -74.006 });

    expect(dumpedGps().latRef).toBe('N');
    expect(dumpedGps().lngRef).toBe('W');
  });

  it('writes the magnitude, not the sign, into the DMS triplet', async () => {
    // EXIF stores direction in the ref field, so a negative degree value here
    // would be read as a corrupt tag rather than a southern coordinate.
    await writeGeotag('file:///tmp/a.jpg', { lat: -33.8688, lng: -70.6693 });

    for (const [degrees] of dumpedGps().lat) expect(degrees).toBeGreaterThanOrEqual(0);
    for (const [degrees] of dumpedGps().lng) expect(degrees).toBeGreaterThanOrEqual(0);
  });
});

describe('writeGeotag DMS conversion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('converts decimal degrees to degrees/minutes/seconds rationals', async () => {
    // 27.7172° = 27° 43' 1.92"
    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7172, lng: 85.324 });

    const [deg, min, sec] = dumpedGps().lat;
    expect(deg).toEqual([27, 1]);
    expect(min).toEqual([43, 1]);
    expect(sec[0] / sec[1]).toBeCloseTo(1.92, 1);
  });

  it('handles a whole-degree coordinate without drifting', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: 27, lng: 85 });

    expect(dumpedGps().lat).toEqual([
      [27, 1],
      [0, 1],
      [0, 100],
    ]);
  });

  it('handles the equator and prime meridian', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: 0, lng: 0 });

    expect(dumpedGps().latRef).toBe('N');
    expect(dumpedGps().lngRef).toBe('E');
    expect(dumpedGps().lat[0]).toEqual([0, 1]);
  });
});

describe('writeGeotag output file', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes a new file and leaves the original untouched', async () => {
    const out = await writeGeotag('file:///tmp/photo.jpg', { lat: 27.7, lng: 85.3 });

    expect(out).toBe('file:///tmp/photo-geo.jpg');
    expect(out).not.toBe('file:///tmp/photo.jpg');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file:///tmp/photo-geo.jpg', 'TAGGED', {
      encoding: 'base64',
    });
  });

  it('normalises a .jpeg extension', async () => {
    expect(await writeGeotag('file:///tmp/photo.jpeg', { lat: 27.7, lng: 85.3 })).toBe(
      'file:///tmp/photo-geo.jpg'
    );
  });

  it('normalises an uppercase extension', async () => {
    expect(await writeGeotag('file:///tmp/PHOTO.JPG', { lat: 27.7, lng: 85.3 })).toBe(
      'file:///tmp/PHOTO-geo.jpg'
    );
  });

  it('still produces a .jpg when the source path has no extension', async () => {
    expect(await writeGeotag('file:///tmp/photo', { lat: 27.7, lng: 85.3 })).toBe(
      'file:///tmp/photo-geo.jpg'
    );
  });

  it('reads and writes base64 without ever hitting the network', async () => {
    await writeGeotag('file:///tmp/photo.jpg', { lat: 27.7, lng: 85.3 });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///tmp/photo.jpg', {
      encoding: 'base64',
    });
    expect(piexif.insert).toHaveBeenCalledWith('EXIFBYTES', 'data:image/jpeg;base64,BASE64DATA');
  });
});
