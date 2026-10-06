import { distanceSquared } from '../../geometry.js';
import type { ScanPoint } from '../../types.js';
import type { SelectorProtocol } from '../protocol.js';

/** Pick the farthest candidate. Ties resolve to the first one encountered. */
export class FurthestEnemiesSelector implements SelectorProtocol {
  readonly name = 'furthest-enemies';

  select(points: readonly ScanPoint[]): ScanPoint {
    return points.reduce((furthest, point) =>
      distanceSquared(point) > distanceSquared(furthest) ? point : furthest,
    );
  }
}
