/** Pure camera helpers: zoom maths and timer formatting. No React, no hardware. */

export interface ZoomRange {
  min: number;
  max: number;
  /** The zoom factor that equals the "1×" main lens. On multi-lens phones this can be above `min` (an ultra-wide sits below it). */
  neutral: number;
}

export interface ZoomStop {
  label: string;
  zoom: number;
}

interface TouchPoint {
  pageX: number;
  pageY: number;
}

/** What a lens's zoom factor is called on screen, relative to the main lens: 0.5×, 1×, 2.5× … */
const STOP_MULTIPLIERS = [0.5, 1, 2, 5, 10];

/** Float slack when deciding whether a preset stop fits inside the lens's range. */
const EPSILON = 1e-6;

export function clampZoom(zoom: number, min: number, max: number): number {
  return Math.min(Math.max(zoom, min), max);
}

export function touchDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * Zoom for an in-progress pinch: the zoom when the fingers went down, scaled by
 * how far apart they are now versus then. Spreading zooms in, pinching out zooms out.
 */
export function pinchZoom({
  startZoom,
  startDistance,
  distance,
  min,
  max,
}: {
  startZoom: number;
  startDistance: number;
  distance: number;
  min: number;
  max: number;
}): number {
  // Two touches landing on the same pixel would divide by zero.
  if (startDistance <= 0) return clampZoom(startZoom, min, max);
  return clampZoom(startZoom * (distance / startDistance), min, max);
}

/** "2×", "0.5×", "2.5×" — one decimal at most, no trailing ".0". */
export function zoomLabel(zoom: number, neutral: number): string {
  const multiplier = Math.round((zoom / neutral) * 10) / 10;
  return `${multiplier}×`;
}

/**
 * Quick-select zoom buttons this lens can actually reach, capped at `cap`.
 * Always returns at least the main-lens stop so the row is never empty.
 */
export function zoomStops({ min, max, neutral }: ZoomRange, cap = Number.POSITIVE_INFINITY): ZoomStop[] {
  const top = Math.min(max, cap);
  const stops = STOP_MULTIPLIERS.map(multiplier => ({
    label: zoomLabel(neutral * multiplier, neutral),
    zoom: neutral * multiplier,
  })).filter(stop => stop.zoom >= min - EPSILON && stop.zoom <= top + EPSILON);

  return stops.length > 0 ? stops : [{ label: zoomLabel(neutral, neutral), zoom: neutral }];
}

/** Recording clock: 07 seconds -> "00:07", 75 seconds -> "01:15". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
