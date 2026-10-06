import { clampZoom, formatDuration, pinchZoom, touchDistance, zoomLabel, zoomStops } from '@/utils/camera';

describe('clampZoom', () => {
  it('leaves an in-range zoom alone', () => {
    expect(clampZoom(2, 1, 8)).toBe(2);
  });

  it('pins to the lens limits at either end', () => {
    expect(clampZoom(0.2, 0.5, 8)).toBe(0.5);
    expect(clampZoom(20, 0.5, 8)).toBe(8);
  });
});

describe('touchDistance', () => {
  it('is the straight-line gap between two fingers', () => {
    expect(touchDistance({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 })).toBe(5);
  });

  it('is zero for two touches on the same point', () => {
    expect(touchDistance({ pageX: 10, pageY: 10 }, { pageX: 10, pageY: 10 })).toBe(0);
  });
});

describe('pinchZoom', () => {
  const base = { startZoom: 2, startDistance: 100, min: 1, max: 8 };

  it('zooms in proportionally as the fingers spread', () => {
    expect(pinchZoom({ ...base, distance: 200 })).toBe(4);
  });

  it('zooms out as the fingers close', () => {
    expect(pinchZoom({ ...base, distance: 75 })).toBe(1.5);
  });

  it('does not change zoom when the gap has not changed', () => {
    expect(pinchZoom({ ...base, distance: 100 })).toBe(2);
  });

  it('never exceeds the lens maximum however wide the pinch', () => {
    expect(pinchZoom({ ...base, distance: 5000 })).toBe(8);
  });

  it('never drops below the lens minimum however tight the pinch', () => {
    expect(pinchZoom({ ...base, distance: 1 })).toBe(1);
  });

  it('holds the starting zoom rather than dividing by zero when fingers began on one point', () => {
    expect(pinchZoom({ ...base, startDistance: 0, distance: 50 })).toBe(2);
  });
});

describe('zoomLabel', () => {
  it('drops the trailing .0 on whole multiples', () => {
    expect(zoomLabel(2, 1)).toBe('2×');
  });

  it('keeps one decimal for fractions', () => {
    expect(zoomLabel(0.5, 1)).toBe('0.5×');
    expect(zoomLabel(2.5, 1)).toBe('2.5×');
  });

  it('is relative to the main lens, not the raw zoom factor', () => {
    // On a phone whose main lens sits at raw zoom 2, raw zoom 4 is "2×".
    expect(zoomLabel(4, 2)).toBe('2×');
  });
});

describe('zoomStops', () => {
  it('offers only the presets the lens can reach', () => {
    const stops = zoomStops({ min: 1, max: 4, neutral: 1 });
    expect(stops.map(s => s.label)).toEqual(['1×', '2×']);
  });

  it('includes 0.5x on a phone with an ultra-wide lens', () => {
    const stops = zoomStops({ min: 0.5, max: 8, neutral: 1 });
    expect(stops.map(s => s.label)).toEqual(['0.5×', '1×', '2×', '5×']);
  });

  it('caps the top stop even if the lens can go further', () => {
    const stops = zoomStops({ min: 1, max: 30, neutral: 1 }, 10);
    expect(stops[stops.length - 1].label).toBe('10×');
    expect(stops.every(s => s.zoom <= 10)).toBe(true);
  });

  it('scales stops off the main lens when it is not raw zoom 1', () => {
    // Main lens at raw 2, ultra-wide at raw 1: stops must still read 0.5x/1x/2x.
    const stops = zoomStops({ min: 1, max: 8, neutral: 2 });
    expect(stops.map(s => [s.label, s.zoom])).toEqual([
      ['0.5×', 1],
      ['1×', 2],
      ['2×', 4],
    ]);
  });

  it('never returns an empty row, even for a fixed-zoom lens', () => {
    const stops = zoomStops({ min: 1, max: 1, neutral: 1 });
    expect(stops).toEqual([{ label: '1×', zoom: 1 }]);
  });
});

describe('formatDuration', () => {
  it('pads to mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(7_000)).toBe('00:07');
  });

  it('rolls seconds into minutes', () => {
    expect(formatDuration(75_000)).toBe('01:15');
  });

  it('floors partial seconds rather than rounding up', () => {
    expect(formatDuration(6_999)).toBe('00:06');
  });

  it('treats a negative clock skew as zero', () => {
    expect(formatDuration(-500)).toBe('00:00');
  });
});
