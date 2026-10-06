import type { ScanPoint } from '../../types.js';
import type { FilterProtocol } from '../protocol.js';

/** Prefer points holding allies; if none does, keep every candidate. */
export class AssistAlliesFilter implements FilterProtocol {
  readonly name = 'assist-allies';

  filter(points: readonly ScanPoint[]): ScanPoint[] {
    const withAllies = points.filter((point) => (point.allies ?? 0) > 0);
    return withAllies.length > 0 ? withAllies : points.slice();
  }
}
