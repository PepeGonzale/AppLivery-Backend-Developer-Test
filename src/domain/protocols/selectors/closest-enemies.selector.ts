import { distanceSquared } from '../../geometry.js';
import type { ScanPoint } from '../../types.js';
import type { SelectorProtocol } from '../protocol.js';

/** Pick the nearest candidate. Ties resolve to the first one encountered. */
export class ClosestEnemiesSelector implements SelectorProtocol {
  readonly name = 'closest-enemies';

  select(points: readonly ScanPoint[]): ScanPoint {
    return points.reduce((closest, point) =>
      distanceSquared(point) < distanceSquared(closest) ? point : closest,
    );
  }
}
