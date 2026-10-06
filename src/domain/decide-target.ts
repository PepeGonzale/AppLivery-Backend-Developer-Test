import { isWithinRange } from './geometry.js';
import { DEFAULT_SELECTOR, FILTER_PROTOCOLS, SELECTOR_PROTOCOLS } from './protocols/registry.js';
import type { Coordinates, RadarRequest, RadarResponse } from './types.js';

export function normalizeProtocols(protocols: string | string[]): string[] {
  return Array.isArray(protocols) ? protocols : [protocols];
}

export interface FilterTrace {
  name: string;
  before: number;
  after: number;
}

/** Data-only trace of the pipeline, so the core stays free of I/O. */
export interface DecisionTrace {
  engageable: number;
  inRange: number;
  filters: FilterTrace[];
  selector: string | null;
  candidates: number;
  target: Coordinates | null;
}

export interface Decision {
  target: RadarResponse | null;
  trace: DecisionTrace;
}

/**
 * Pure, zero-I/O. Drops empty and out-of-range points up front, applies the
 * filters in canonical order and picks a selector. Unknown protocol names are
 * ignored here; the HTTP boundary rejects them before they get this far.
 */
export function explainDecision(request: RadarRequest): Decision {
  const requested = new Set(normalizeProtocols(request.protocols));

  const engageable = request.scan.filter((point) => point.enemies.number > 0);
  let candidates = engageable.filter(isWithinRange);
  const inRange = candidates.length; // snapshot for the trace, before filters shrink it

  const filters: FilterTrace[] = [];
  for (const filter of FILTER_PROTOCOLS) {
    if (requested.has(filter.name)) {
      const before = candidates.length;
      candidates = filter.filter(candidates);
      filters.push({ name: filter.name, before, after: candidates.length });
    }
  }

  if (candidates.length === 0) {
    return {
      target: null,
      trace: { engageable: engageable.length, inRange, filters, selector: null, candidates: 0, target: null },
    };
  }

  const selector = SELECTOR_PROTOCOLS.find((candidate) => requested.has(candidate.name)) ?? DEFAULT_SELECTOR;
  const target = selector.select(candidates);

  return {
    target: { x: target.coordinates.x, y: target.coordinates.y },
    trace: {
      engageable: engageable.length,
      inRange,
      filters,
      selector: selector.name,
      candidates: candidates.length,
      target: target.coordinates,
    },
  };
}

export function decideTarget(request: RadarRequest): RadarResponse | null {
  return explainDecision(request).target;
}
