/**
 * open-location-code ships no types and has no @types package — minimal
 * ambient declaration covering the surface geo.ts actually uses.
 */
declare module 'open-location-code' {
  export class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): {
      latitudeLo: number;
      longitudeLo: number;
      latitudeHi: number;
      longitudeHi: number;
      latitudeCenter: number;
      longitudeCenter: number;
      codeLength: number;
    };
    isValid(code: string): boolean;
  }
}
