/** Presentation-only formatting helpers. No business logic lives here. */

const DAY_MS = 24 * 3_600_000;

/**
 * How long ago `at` was, the one rule used across the app: "45s ago",
 * "12m ago", "3h 5m ago" under a day; after that the day and time,
 * "Yesterday, 2:47 PM" or "Wed 8 Oct, 2:47 PM" — "43h 1m ago" is hard to read.
 */
export function timeAgo(at: number, now: number = Date.now()): string {
  // `at` is often a Firebase server timestamp and `now` the phone's clock. A
  // phone running a few seconds behind can make the gap slightly negative —
  // clamp so that reads as "0s ago" instead of "-4s ago".
  const ms = Math.max(0, now - at);
  if (ms >= DAY_MS) return `${dayLabel(at, now)}, ${formatClockTime(at)}`;

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s ago`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m ago`;
}

export function formatCoord(lat: number, lng: number): string {
  const latRef = lat >= 0 ? 'N' : 'S';
  const lngRef = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latRef}, ${Math.abs(lng).toFixed(6)}° ${lngRef}`;
}

export function formatAccuracy(accuracyMeters: number): string {
  return `±${Math.round(accuracyMeters)} m`;
}

/** A 0–1 battery level as a percent; an em dash when the phone hasn't reported one. */
export function formatBatteryPercent(batteryFraction: number | undefined): string {
  if (batteryFraction == null) return '—';
  return `${Math.round(batteryFraction * 100)}%`;
}

/** Device-local time of day, e.g. "9:05 AM". */
export function formatClockTime(epochMs: number): string {
  const date = new Date(epochMs);
  const hour = date.getHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Calendar day (device-local) as a header: "Today", "Yesterday", "Wed 8 Oct". */
export function dayLabel(epochMs: number, now: number = Date.now()): string {
  const date = new Date(epochMs);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Today, 9:05 AM", "Yesterday, 9:05 AM" or "Wed 8 Oct, 9:05 AM" (device-local). */
export function formatDayTime(epochMs: number, now: number = Date.now()): string {
  return `${dayLabel(epochMs, now)}, ${formatClockTime(epochMs)}`;
}

/** Splits a newest-first list into one section per calendar day, keeping order. */
export function groupByDay<T>(
  items: T[],
  timeOf: (item: T) => number,
  now: number = Date.now()
): { title: string; data: T[] }[] {
  const sections: { title: string; data: T[] }[] = [];
  for (const item of items) {
    const title = dayLabel(timeOf(item), now);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}
