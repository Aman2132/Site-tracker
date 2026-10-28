/**
 * piexifjs ships no types and has no @types package — minimal ambient
 * declaration covering the surface exifService.ts actually uses.
 */
declare module 'piexifjs' {
  export const GPSIFD: {
    GPSLatitudeRef: number;
    GPSLatitude: number;
    GPSLongitudeRef: number;
    GPSLongitude: number;
    GPSAltitude: number;
    GPSTimeStamp: number;
  };

  export const ImageIFD: {
    /** 1-8: how the viewer must rotate/flip the pixels to display the photo upright. */
    Orientation: number;
  };

  interface ExifDict {
    '0th'?: Record<number, unknown>;
    GPS?: Record<number, unknown>;
    [key: string]: unknown;
  }

  export function dump(exifDict: ExifDict): string;
  export function insert(exifBytes: string, jpegDataUrl: string): string;
  export function load(jpegDataUrl: string): ExifDict;
}
