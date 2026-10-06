/** `#rrggbb` (or `#rgb`) plus an alpha 0-1 as an `rgba(...)` string. Unparseable input is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map(d => d + d)
          .join('')
      : match[1];
  const r = parseInt(digits.slice(0, 2), 16);
  const g = parseInt(digits.slice(2, 4), 16);
  const b = parseInt(digits.slice(4, 6), 16);
  const a = Math.min(Math.max(alpha, 0), 1);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * One colour per trail point, fading from transparent (oldest) to solid
 * (newest), for a polyline's `strokeColors`. Always the same length as the trail.
 */
export function trailGradient(hex: string, points: number, minAlpha = 0.05, maxAlpha = 0.9): string[] {
  if (points <= 0) return [];
  if (points === 1) return [withAlpha(hex, maxAlpha)];
  return Array.from({ length: points }, (_, i) =>
    withAlpha(hex, minAlpha + ((maxAlpha - minAlpha) * i) / (points - 1))
  );
}
