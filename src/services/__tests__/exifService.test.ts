import piexif from 'piexifjs';

import { writeGeotag } from '@/services/exifService';

// expo-file-system's File API is class-based: each `new File(uri)` is a fresh
// handle. The mock records every constructed uri and shares the method spies
// across instances so tests can assert on what was read and written.
const mockBase64 = jest.fn(async () => 'BASE64DATA');
const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockConstructed: string[] = [];

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
      mockConstructed.push(uri);
    }
    base64 = mockBase64;
    create = mockCreate;
    write = mockWrite;
  },
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
    ImageIFD: { Orientation: 274 },
    load: jest.fn(() => ({})),
    dump: jest.fn(() => 'EXIFBYTES'),
    insert: jest.fn(() => 'data:image/jpeg;base64,TAGGED'),
  },
}));

function dumpedGps() {
  return (piexif.dump as jest.Mock).mock.calls[0][0].GPS;
}

beforeEach(() => {
  (piexif.load as jest.Mock).mockReset().mockReturnValue({});
  (piexif.dump as jest.Mock).mockReset().mockReturnValue('EXIFBYTES');
});

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockConstructed.length = 0;
  });

  it('writes a new file and leaves the original untouched', async () => {
    const out = await writeGeotag('file:///tmp/photo.jpg', { lat: 27.7, lng: 85.3 });

    expect(out).toBe('file:///tmp/photo-geo.jpg');
    expect(out).not.toBe('file:///tmp/photo.jpg');
    expect(mockWrite).toHaveBeenCalledWith('TAGGED', { encoding: 'base64' });
  });

  it('overwrites an earlier -geo copy instead of failing on it', async () => {
    // File.create() throws if the target already exists, so re-tagging the
    // same capture would crash without an explicit overwrite.
    await writeGeotag('file:///tmp/photo.jpg', { lat: 27.7, lng: 85.3 });

    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
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

    expect(mockConstructed[0]).toBe('file:///tmp/photo.jpg');
    expect(mockBase64).toHaveBeenCalledTimes(1);
    expect(piexif.insert).toHaveBeenCalledWith('EXIFBYTES', 'data:image/jpeg;base64,BASE64DATA');
  });
});

describe('writeGeotag preserves the existing EXIF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConstructed.length = 0;
  });

  const portraitExif = {
    '0th': { 274: 6, 271: 'Xiaomi', 272: 'Redmi Note' },
    Exif: { 36867: '2026:09:24 21:00:00' },
  };

  it('keeps Orientation and the camera details alongside the new GPS', async () => {
    // Without Orientation a portrait shot displays sideways in every gallery.
    (piexif.load as jest.Mock).mockReturnValue(portraitExif);

    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7, lng: 85.3 });

    const dumped = (piexif.dump as jest.Mock).mock.calls[0][0];
    expect(dumped['0th']).toEqual(portraitExif['0th']);
    expect(dumped.Exif).toEqual(portraitExif.Exif);
    expect(dumped.GPS.latRef).toBe('N');
  });

  it('reads the EXIF from the photo it was given', async () => {
    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7, lng: 85.3 });

    expect(piexif.load).toHaveBeenCalledWith('data:image/jpeg;base64,BASE64DATA');
  });

  it('still tags a photo that has no EXIF block at all', async () => {
    (piexif.load as jest.Mock).mockImplementation(() => {
      throw new Error('no exif');
    });

    await expect(writeGeotag('file:///tmp/a.jpg', { lat: 27.7, lng: 85.3 })).resolves.toBe(
      'file:///tmp/a-geo.jpg'
    );
    expect(dumpedGps().latRef).toBe('N');
  });

  it('falls back to Orientation-only when the maker tags cannot be re-saved', async () => {
    (piexif.load as jest.Mock).mockReturnValue(portraitExif);
    (piexif.dump as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('bad maker tag');
      })
      .mockReturnValueOnce('EXIFBYTES');

    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7, lng: 85.3 });

    expect(piexif.dump).toHaveBeenCalledTimes(2);
    const retried = (piexif.dump as jest.Mock).mock.calls[1][0];
    expect(retried['0th']).toEqual({ 274: 6 });
    expect(retried.Exif).toBeUndefined();
    expect(retried.GPS.latRef).toBe('N');
  });

  it('falls back to GPS-only when there was no Orientation to keep', async () => {
    (piexif.load as jest.Mock).mockReturnValue({ '0th': { 271: 'Xiaomi' } });
    (piexif.dump as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('bad maker tag');
      })
      .mockReturnValueOnce('EXIFBYTES');

    await writeGeotag('file:///tmp/a.jpg', { lat: 27.7, lng: 85.3 });

    expect((piexif.dump as jest.Mock).mock.calls[1][0]['0th']).toEqual({});
  });
});
