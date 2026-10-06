import type { ScanPoint } from '../../types.js';
import type { FilterProtocol } from '../protocol.js';

/** Restrict to mechs when any exists; otherwise keep every candidate. */
export class PrioritizeMechFilter implements FilterProtocol {
  readonly name = 'prioritize-mech';

  filter(points: readonly ScanPoint[]): ScanPoint[] {
    const mechs = points.filter((point) => point.enemies.type === 'mech');
    return mechs.length > 0 ? mechs : points.slice();
  }
}
