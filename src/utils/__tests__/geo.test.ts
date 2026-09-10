import { distanceMeters, geoCirclePolygon, isWithinRadius, offsetMeters } from '@/utils/geo';

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 28.6139, lng: 77.209 }, { lat: 28.6139, lng: 77.209 })).toBe(0);
  });

  it('matches a known real-world distance within tolerance', () => {
    // Roughly 1km apart along a meridian near Delhi (equirectangular approximation).
    const a = { lat: 28.6139, lng: 77.209 };
    const b = { lat: 28.6229, lng: 77.209 };
    expect(distanceMeters(a, b)).toBeCloseTo(1001.9, 0);
  });
});

describe('isWithinRadius', () => {
  const center = { lat: 28.6139, lng: 77.209 };

  it('is true for a point well inside the radius', () => {
    expect(isWithinRadius({ lat: 28.614, lng: 77.209 }, center, 150)).toBe(true);
  });

  it('is false for a point well outside the radius', () => {
    expect(isWithinRadius({ lat: 28.63, lng: 77.209 }, center, 150)).toBe(false);
  });
});

describe('offsetMeters', () => {
  it('is zero offset for the center itself', () => {
    const center = { lat: 28.6139, lng: 77.209 };
    const { east, north } = offsetMeters(center, center);
    expect(east).toBe(0);
    expect(north).toBe(0);
  });

  it('reports north as positive for a point above the center', () => {
    const center = { lat: 28.6139, lng: 77.209 };
    const north = { lat: 28.62, lng: 77.209 };
    const offset = offsetMeters(north, center);
    expect(offset.north).toBeGreaterThan(0);
    expect(offset.east).toBeCloseTo(0, 5);
  });

  it('reports east as positive for a point to the right of the center', () => {
    const center = { lat: 28.6139, lng: 77.209 };
    const east = { lat: 28.6139, lng: 77.22 };
    const offset = offsetMeters(east, center);
    expect(offset.east).toBeGreaterThan(0);
    expect(offset.north).toBeCloseTo(0, 5);
  });
});

describe('geoCirclePolygon', () => {
  it('produces a closed ring with the requested point count', () => {
    const polygon = geoCirclePolygon({ lat: 28.6139, lng: 77.209 }, 150, 32);
    const ring = polygon.geometry.coordinates[0];
    expect(ring).toHaveLength(33); // 32 segments + closing point
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('keeps every ring point roughly radiusMeters from the center', () => {
    const center = { lat: 28.6139, lng: 77.209 };
    const radiusMeters = 200;
    const polygon = geoCirclePolygon(center, radiusMeters, 16);
    const ring = polygon.geometry.coordinates[0];

    for (const [lng, lat] of ring) {
      expect(distanceMeters(center, { lat, lng })).toBeCloseTo(radiusMeters, -1);
    }
  });
});
