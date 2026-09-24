/** Presentation-only formatting helpers. No business logic lives here. */

export function timeAgo(ms: number): string {
  // lastFixAt is a Firebase server timestamp; Date.now() is the local device
  // clock. A device running a few seconds behind can make ms come out
  // slightly negative — clamp so that reads as "just now" instead of "-4s ago".
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s ago`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m ago`;
}

export function formatCoord(lat: number, lng: number): string {
  const latRef = lat >= 0 ? 'N' : 'S';
  const lngRef = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latRef}, ${Math.abs(lng).toFixed(6)}° ${lngRef}`;
}

export function formatAccuracy(accuracyMeters: number): string {
  return `±${Math.round(accuracyMeters)} m`;
}

export function formatBatteryPercent(batteryFraction: number): string {
  return `${Math.round(batteryFraction * 100)}%`;
}

export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
