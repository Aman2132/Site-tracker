import { smoothAccuracy } from '@/utils/gps';

describe('smoothAccuracy', () => {
  it('takes the first sample as-is', () => {
    expect(smoothAccuracy(null, 12, 0.35)).toBe(12);
  });

  it('moves part of the way toward a new sample', () => {
    expect(smoothAccuracy(10, 20, 0.5)).toBe(15);
  });

  it('does not jump on a single outlier', () => {
    const next = smoothAccuracy(5, 50, 0.35);
    expect(next).toBeLessThan(25);
    expect(next).toBeGreaterThan(5);
  });

  it('converges on a steady value', () => {
    let value: number | null = 30;
    for (let i = 0; i < 30; i += 1) value = smoothAccuracy(value, 4, 0.35);
    expect(value).toBeCloseTo(4, 1);
  });

  it('with alpha 1 simply follows the sample', () => {
    expect(smoothAccuracy(3, 9, 1)).toBe(9);
  });
});
