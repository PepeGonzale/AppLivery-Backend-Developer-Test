import type { ScanPoint } from '../types.js';

/** Narrows the candidates. A new criterion is one class plus one line in the registry. */
export interface FilterProtocol {
  readonly name: string;
  filter(points: readonly ScanPoint[]): ScanPoint[];
}

/** Picks one point. At most one selector per request. */
export interface SelectorProtocol {
  readonly name: string;
  select(points: readonly ScanPoint[]): ScanPoint;
}
