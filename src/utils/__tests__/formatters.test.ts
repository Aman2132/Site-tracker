import {
  dayLabel,
  formatAccuracy,
  formatBatteryPercent,
  formatClockTime,
  formatCoord,
  formatDayTime,
  groupByDay,
  initials,
  timeAgo,
} from '@/utils/formatters';

/** Thu 8 Oct 2026, 3:00 PM device time. */
const NOW = new Date(2026, 9, 8, 15, 0).getTime();
/** timeAgo for something `duration` ms before NOW. */
const ago = (duration: number) => timeAgo(NOW - duration, NOW);

describe('timeAgo', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(ago(45_000)).toBe('45s ago');
  });

  it('formats sub-hour durations in minutes', () => {
    expect(ago(5 * 60_000)).toBe('5m ago');
  });

  it('formats multi-hour durations as hours and minutes', () => {
    expect(ago(2 * 3_600_000 + 15 * 60_000)).toBe('2h 15m ago');
  });
});

describe('timeAgo boundaries', () => {
  it('handles a just-now fix', () => {
    expect(ago(0)).toBe('0s ago');
  });

  it('switches to minutes exactly at 60 seconds', () => {
    expect(ago(59_999)).toBe('59s ago');
    expect(ago(60_000)).toBe('1m ago');
  });

  it('switches to hours exactly at 60 minutes, keeping a zero minute part', () => {
    expect(ago(3_599_999)).toBe('59m ago');
    expect(ago(3_600_000)).toBe('1h 0m ago');
  });

  it('clamps a negative duration to "just now" instead of going negative', () => {
    // lastFixAt is a Firebase server timestamp; Date.now() is the local
    // device clock. A device running a few seconds behind produces a
    // small negative ms here.
    expect(ago(-4_000)).toBe('0s ago');
    expect(ago(-1)).toBe('0s ago');
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

  it('shows a dash rather than a made-up level when the phone never reported one', () => {
    expect(formatBatteryPercent(undefined)).toBe('—');
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

describe('timeAgo past a day', () => {
  it('switches to "Yesterday, time" instead of "43h 1m ago"', () => {
    const at = new Date(2026, 9, 7, 14, 47).getTime();
    expect(timeAgo(at, NOW)).toBe('Yesterday, 2:47 PM');
  });

  it('names the weekday and date for anything older', () => {
    const at = new Date(2026, 9, 5, 9, 5).getTime();
    expect(timeAgo(at, NOW)).toBe('Mon 5 Oct, 9:05 AM');
  });

  it('stays relative just under 24 hours', () => {
    expect(ago(23 * 3_600_000 + 59 * 60_000)).toBe('23h 59m ago');
  });
});

describe('formatClockTime', () => {
  it('uses a 12-hour clock with AM/PM', () => {
    expect(formatClockTime(new Date(2026, 0, 1, 0, 5).getTime())).toBe('12:05 AM');
    expect(formatClockTime(new Date(2026, 0, 1, 12, 0).getTime())).toBe('12:00 PM');
  });
});

describe('dayLabel / formatDayTime', () => {
  it('reads Today, Yesterday, then weekday + date', () => {
    expect(dayLabel(new Date(2026, 9, 8, 1).getTime(), NOW)).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 7, 23).getTime(), NOW)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 9, 1, 12).getTime(), NOW)).toBe('Thu 1 Oct');
  });

  it('crosses a month boundary for yesterday', () => {
    const firstOfMonth = new Date(2026, 10, 1, 8).getTime();
    expect(dayLabel(new Date(2026, 9, 31, 22).getTime(), firstOfMonth)).toBe('Yesterday');
  });

  it('joins day and time', () => {
    expect(formatDayTime(new Date(2026, 9, 8, 9, 5).getTime(), NOW)).toBe('Today, 9:05 AM');
  });
});

describe('groupByDay', () => {
  it('splits a newest-first list into day sections, in order', () => {
    const times = [
      new Date(2026, 9, 8, 14).getTime(),
      new Date(2026, 9, 8, 9).getTime(),
      new Date(2026, 9, 7, 18).getTime(),
      new Date(2026, 9, 1, 10).getTime(),
    ];
    expect(groupByDay(times, t => t, NOW)).toEqual([
      { title: 'Today', data: [times[0], times[1]] },
      { title: 'Yesterday', data: [times[2]] },
      { title: 'Thu 1 Oct', data: [times[3]] },
    ]);
  });
});
