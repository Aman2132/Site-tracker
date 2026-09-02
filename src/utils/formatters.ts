/** Presentation-only formatting helpers. No business logic lives here. */

export function timeAgo(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s ago`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m ago`;
}

export function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`;
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
