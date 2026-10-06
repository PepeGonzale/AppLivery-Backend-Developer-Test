import type { ScanPoint } from '../../types.js';
import type { FilterProtocol } from '../protocol.js';

/** Never engage a point that holds allies, to avoid friendly fire. */
export class AvoidCrossfireFilter implements FilterProtocol {
  readonly name = 'avoid-crossfire';

  filter(points: readonly ScanPoint[]): ScanPoint[] {
    return points.filter((point) => (point.allies ?? 0) === 0);
  }
}
