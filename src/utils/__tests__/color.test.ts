import { trailGradient, withAlpha } from '@/utils/color';

describe('withAlpha', () => {
  it('converts 6-digit hex', () => {
    expect(withAlpha('#1a73e8', 0.5)).toBe('rgba(26,115,232,0.5)');
  });

  it('expands 3-digit hex', () => {
    expect(withAlpha('#fff', 1)).toBe('rgba(255,255,255,1)');
  });

  it('clamps alpha', () => {
    expect(withAlpha('#000000', 2)).toBe('rgba(0,0,0,1)');
    expect(withAlpha('#000000', -1)).toBe('rgba(0,0,0,0)');
  });

  it('leaves anything it cannot parse alone', () => {
    expect(withAlpha('red', 0.5)).toBe('red');
  });
});

describe('trailGradient', () => {
  it('has one colour per point', () => {
    expect(trailGradient('#1a73e8', 7)).toHaveLength(7);
    expect(trailGradient('#1a73e8', 0)).toEqual([]);
  });

  it('fades from the oldest point to the newest', () => {
    const colors = trailGradient('#000000', 3, 0, 1);
    expect(colors).toEqual(['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,1)']);
  });

  it('draws a single point solid', () => {
    expect(trailGradient('#000000', 1, 0, 0.9)).toEqual(['rgba(0,0,0,0.9)']);
  });
});
