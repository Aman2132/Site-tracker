import { formatAccuracy, formatBatteryPercent, formatCoord, initials, timeAgo } from '@/utils/formatters';

describe('timeAgo', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(timeAgo(45_000)).toBe('45s ago');
  });

  it('formats sub-hour durations in minutes', () => {
    expect(timeAgo(5 * 60_000)).toBe('5m ago');
  });

  it('formats multi-hour durations as hours and minutes', () => {
    expect(timeAgo(2 * 3_600_000 + 15 * 60_000)).toBe('2h 15m ago');
  });
});

describe('timeAgo boundaries', () => {
  it('handles a just-now fix', () => {
    expect(timeAgo(0)).toBe('0s ago');
  });

  it('switches to minutes exactly at 60 seconds', () => {
    expect(timeAgo(59_999)).toBe('59s ago');
    expect(timeAgo(60_000)).toBe('1m ago');
  });

  it('switches to hours exactly at 60 minutes, keeping a zero minute part', () => {
    expect(timeAgo(3_599_999)).toBe('59m ago');
    expect(timeAgo(3_600_000)).toBe('1h 0m ago');
  });

  it('clamps a negative duration to "just now" instead of going negative', () => {
    // lastFixAt is a Firebase server timestamp; Date.now() is the local
    // device clock. A device running a few seconds behind produces a
    // small negative ms here.
    expect(timeAgo(-4_000)).toBe('0s ago');
    expect(timeAgo(-1)).toBe('0s ago');
  });
});

describe('formatCoord', () => {
  it('formats latitude/longitude to 6 decimal places with hemisphere labels', () => {
    expect(formatCoord(28.6139, 77.209)).toBe('28.613900° N, 77.209000° E');
  });

  it('labels a southern latitude as S, not N', () => {
    expect(formatCoord(-33.8688, 151.2093)).toBe('33.868800° S, 151.209300° E');
  });

  it('labels a western longitude as W, not E', () => {
    expect(formatCoord(40.7128, -74.006)).toBe('40.712800° N, 74.006000° W');
  });

  it('handles the southern and western hemispheres together', () => {
    expect(formatCoord(-34.6037, -58.3816)).toBe('34.603700° S, 58.381600° W');
  });

  it('never prints a negative number next to a hemisphere letter', () => {
    expect(formatCoord(-33.8688, -70.6693)).not.toMatch(/-/);
  });
});

describe('formatAccuracy', () => {
  it('rounds to the nearest meter with a ± prefix', () => {
    expect(formatAccuracy(11.6)).toBe('±12 m');
    expect(formatAccuracy(6.4)).toBe('±6 m');
  });
});

describe('formatBatteryPercent', () => {
  it('converts a 0-1 fraction to a rounded percent', () => {
    expect(formatBatteryPercent(0.71)).toBe('71%');
    expect(formatBatteryPercent(0.005)).toBe('1%');
  });
});

describe('initials', () => {
  it('takes the first letter of up to two words, uppercased', () => {
    expect(initials('Ramesh Kumar')).toBe('RK');
    expect(initials('suryakant')).toBe('S');
  });

  it('ignores extra middle names beyond the first two initials', () => {
    expect(initials('Arjun Bahadur Thakur')).toBe('AB');
  });

  it('returns nothing for an empty name instead of crashing the avatar', () => {
    expect(initials('')).toBe('');
  });

  it('copes with padding and double spaces in a seeded name', () => {
    expect(initials('  Ramesh   Kumar ')).toBe('RK');
  });
});

describe('formatBatteryPercent boundaries', () => {
  it('renders a flat and a full battery', () => {
    expect(formatBatteryPercent(0)).toBe('0%');
    expect(formatBatteryPercent(1)).toBe('100%');
  });
});

describe('formatAccuracy boundaries', () => {
  it('rounds a sub-meter reading down to zero', () => {
    expect(formatAccuracy(0.4)).toBe('±0 m');
  });

  it('renders the sentinel used for "no fix yet"', () => {
    expect(formatAccuracy(9999)).toBe('±9999 m');
  });
});
