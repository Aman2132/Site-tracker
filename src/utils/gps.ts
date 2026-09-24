/**
 * Exponential moving average of GPS accuracy, so the on-screen number settles
 * instead of jumping between raw samples. `previous` is null for the first
 * sample, which is taken as-is. `alpha` (0-1) is how much weight the new
 * sample gets: higher reacts faster, lower is calmer.
 */
export function smoothAccuracy(previous: number | null, sample: number, alpha: number): number {
  if (previous == null) return sample;
  return previous + alpha * (sample - previous);
}
