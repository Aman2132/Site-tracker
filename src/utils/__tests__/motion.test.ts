import { angleDelta, normalizeDegrees, pitchFromTilt, smoothAngle, smoothValue } from '@/utils/motion';

describe('normalizeDegrees', () => {
  it('wraps negatives and overflow into 0-360', () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(370)).toBe(10);
    expect(normalizeDegrees(720)).toBe(0);
  });
});

describe('angleDelta', () => {
  it('takes the short way across north', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });

  it('handles plain differences', () => {
    expect(angleDelta(90, 180)).toBe(90);
    expect(angleDelta(0, 0)).toBe(0);
  });
});

describe('smoothAngle', () => {
  it('takes the first sample as-is', () => {
    expect(smoothAngle(null, 370, 0.2)).toBe(10);
  });

  it('smooths across north without spinning the long way', () => {
    expect(smoothAngle(355, 5, 0.5)).toBeCloseTo(0, 5);
  });

  it('converges on a steady heading', () => {
    let heading: number | null = 100;
    for (let i = 0; i < 60; i += 1) heading = smoothAngle(heading, 200, 0.2);
    expect(heading).toBeCloseTo(200, 1);
  });
});

describe('smoothValue', () => {
  it('moves part of the way', () => {
    expect(smoothValue(0, 10, 0.5)).toBe(5);
    expect(smoothValue(null, 7, 0.5)).toBe(7);
  });
});

describe('pitchFromTilt', () => {
  it('is top-down when the phone lies flat', () => {
    expect(pitchFromTilt(0, 0, 67)).toBe(0);
  });

  it('is fully tilted when the phone is upright', () => {
    expect(pitchFromTilt(Math.PI / 2, 0, 67)).toBe(67);
  });

  it('clamps past upright and treats face-down tilt the same', () => {
    expect(pitchFromTilt(Math.PI, 0, 67)).toBe(67);
    expect(pitchFromTilt(-Math.PI / 4, 0, 60)).toBeCloseTo(30, 5);
  });
});
