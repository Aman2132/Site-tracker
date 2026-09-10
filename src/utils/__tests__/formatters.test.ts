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

describe('formatCoord', () => {
  it('formats latitude/longitude to 6 decimal places with hemisphere labels', () => {
    expect(formatCoord(28.6139, 77.209)).toBe('28.613900° N, 77.209000° E');
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
});
