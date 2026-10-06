import { AssistAlliesFilter } from './filters/assist-allies.filter.js';
import { AvoidCrossfireFilter } from './filters/avoid-crossfire.filter.js';
import { AvoidMechFilter } from './filters/avoid-mech.filter.js';
import { PrioritizeMechFilter } from './filters/prioritize-mech.filter.js';
import type { FilterProtocol, SelectorProtocol } from './protocol.js';
import { ClosestEnemiesSelector } from './selectors/closest-enemies.selector.js';
import { FurthestEnemiesSelector } from './selectors/furthest-enemies.selector.js';

/**
 * Catalogue and application order in one place.
 * Order is semantic: hard exclusions first, preferences second.
 */
export const FILTER_PROTOCOLS: readonly FilterProtocol[] = [
  new AvoidMechFilter(),
  new AvoidCrossfireFilter(),
  new PrioritizeMechFilter(),
  new AssistAlliesFilter(),
];

export const SELECTOR_PROTOCOLS: readonly SelectorProtocol[] = [
  new ClosestEnemiesSelector(),
  new FurthestEnemiesSelector(),
];

/** Fallback for requests that carry filters but no selector. */
export const DEFAULT_SELECTOR: SelectorProtocol = new ClosestEnemiesSelector();

/**
 * Every protocol name the module knows. The HTTP boundary rejects anything else:
 * failing closed beats silently ignoring a restriction.
 */
export const PROTOCOL_NAMES: readonly string[] = [
  ...FILTER_PROTOCOLS.map((protocol) => protocol.name),
  ...SELECTOR_PROTOCOLS.map((protocol) => protocol.name),
];
