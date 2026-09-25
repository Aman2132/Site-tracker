import {
  appendTrailPoint,
  bearingDegrees,
  distanceMeters,
  isWithinRadius,
  nextTrails,
  offsetMeters,
  plusCodeFor,
} from '@/utils/geo';

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

  it('counts the center itself as inside any positive radius', () => {
    expect(isWithinRadius(center, center, 1)).toBe(true);
  });

  it('separates points a metre either side of the fence line', () => {
    // A metre is well inside GPS noise, which is the whole reason
    // driftSafeRadiusMeters exists — the maths itself is this sharp.
    const justInside = { lat: center.lat + 149 / 111_320, lng: center.lng };
    const justOutside = { lat: center.lat + 151 / 111_320, lng: center.lng };

    expect(isWithinRadius(justInside, center, 150)).toBe(true);
    expect(isWithinRadius(justOutside, center, 150)).toBe(false);
  });

  it('treats a zero radius as enclosing nothing', () => {
    expect(isWithinRadius(center, center, 0)).toBe(false);
  });
});

describe('plusCodeFor', () => {
  it('produces a valid plus code for a site coordinate', () => {
    expect(plusCodeFor({ lat: 27.7172, lng: 85.324 })).toMatch(
      /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{2,}$/
    );
  });

  it('gives different codes to points far apart', () => {
    expect(plusCodeFor({ lat: 27.7172, lng: 85.324 })).not.toBe(plusCodeFor({ lat: 28.6139, lng: 77.209 }));
  });

  it('handles southern and western coordinates', () => {
    expect(plusCodeFor({ lat: -33.8688, lng: -70.6693 })).toMatch(/^[23456789CFGHJMPQRVWX]{8}\+/);
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

describe('bearingDegrees', () => {
  const origin = { lat: 27.7172, lng: 85.324 };

  it('points north, east, south and west correctly', () => {
    expect(bearingDegrees(origin, { lat: origin.lat + 0.001, lng: origin.lng })).toBeCloseTo(0, 1);
    expect(bearingDegrees(origin, { lat: origin.lat, lng: origin.lng + 0.001 })).toBeCloseTo(90, 1);
    expect(bearingDegrees(origin, { lat: origin.lat - 0.001, lng: origin.lng })).toBeCloseTo(180, 1);
    expect(bearingDegrees(origin, { lat: origin.lat, lng: origin.lng - 0.001 })).toBeCloseTo(270, 1);
  });

  it('always returns 0-360', () => {
    const bearing = bearingDegrees(origin, { lat: origin.lat + 0.001, lng: origin.lng - 0.00001 });
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('appendTrailPoint', () => {
  const at = (lat: number) => ({ lat, lng: 85.324 });

  it('starts a trail from nothing', () => {
    expect(appendTrailPoint([], at(27.7), 5, 2)).toEqual([at(27.7)]);
  });

  it('ignores jitter smaller than the minimum step, returning the same array', () => {
    const trail = [at(27.7)];
    expect(appendTrailPoint(trail, at(27.700001), 5, 2)).toBe(trail);
  });

  it('adds real movement', () => {
    expect(appendTrailPoint([at(27.7)], at(27.7001), 5, 2)).toHaveLength(2);
  });

  it('keeps only the newest points', () => {
    let trail: { lat: number; lng: number }[] = [];
    for (let i = 0; i < 10; i += 1) trail = appendTrailPoint(trail, at(27.7 + i * 0.001), 4, 2);
    expect(trail).toHaveLength(4);
    expect(trail[3].lat).toBeCloseTo(27.709, 6);
  });

  it('stores only lat/lng, not the whole person', () => {
    const person = { lat: 1, lng: 2, name: 'Asha' };
    expect(appendTrailPoint([], person, 5, 2)).toEqual([{ lat: 1, lng: 2 }]);
  });
});

describe('nextTrails', () => {
  const person = (id: string, lat: number) => ({ id, lat, lng: 85.324 });

  it('returns the same object when nobody moved', () => {
    const trails = nextTrails({}, [person('a', 27.7)], 5, 2);
    expect(nextTrails(trails, [person('a', 27.7)], 5, 2)).toBe(trails);
  });

  it('extends the trail of someone who moved', () => {
    const trails = nextTrails({}, [person('a', 27.7)], 5, 2);
    expect(nextTrails(trails, [person('a', 27.701)], 5, 2).a).toHaveLength(2);
  });

  it('forgets people who left the roster', () => {
    const trails = nextTrails({}, [person('a', 27.7), person('b', 27.7)], 5, 2);
    expect(Object.keys(nextTrails(trails, [person('a', 27.7)], 5, 2))).toEqual(['a']);
  });
});
