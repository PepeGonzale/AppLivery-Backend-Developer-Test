import type { ScanPoint } from '../../types.js';
import type { FilterProtocol } from '../protocol.js';

/** Never engage a mech. */
export class AvoidMechFilter implements FilterProtocol {
  readonly name = 'avoid-mech';

  filter(points: readonly ScanPoint[]): ScanPoint[] {
    return points.filter((point) => point.enemies.type !== 'mech');
  }
}
