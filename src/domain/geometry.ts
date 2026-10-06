import type { ScanPoint } from './types.js';

/** Points beyond this are never engaged, whatever the protocols. */
export const MAX_RANGE = 100;

/**
 * Squared distance from the droid: no sqrt, no float drift.
 * The 100m cut-off is compared squared too.
 */
export function distanceSquared(point: ScanPoint): number {
  const { x, y } = point.coordinates;
  return x * x + y * y;
}

export function isWithinRange(point: ScanPoint): boolean {
  return distanceSquared(point) <= MAX_RANGE * MAX_RANGE;
}
