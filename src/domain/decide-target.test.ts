import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { decideTarget, explainDecision, normalizeProtocols } from './decide-target.js';
import type { RadarRequest } from './types.js';

interface OfficialCase {
  position: number;
  input: RadarRequest;
  expected: string;
}

/**
 * The official `test_cases.txt` doubles as a DB-free unit test: keeps the
 * pure function locked to the grader's contract before HTTP is involved.
 */
function loadOfficialCases(): OfficialCase[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const casesPath = resolve(here, '../../test_cases.txt');

  return readFileSync(casesPath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .map((line, index) => {
      const [rawInput, rawExpected] = line.split('|');
      if (rawInput === undefined || rawExpected === undefined) {
        throw new Error(`Malformed test case at line ${index + 1}`);
      }
      return {
        position: index + 1,
        input: JSON.parse(rawInput) as RadarRequest,
        expected: rawExpected,
      };
    });
}

describe('decideTarget — official cases', () => {
  const cases = loadOfficialCases();

  it('loads all 13 official cases', () => {
    expect(cases).toHaveLength(13);
  });

  it.each(cases)('case #$position -> $expected', ({ input, expected }) => {
    expect(JSON.stringify(decideTarget(input))).toBe(expected);
  });
});

describe('decideTarget — rules and edge cases', () => {
  it('ignores every point beyond 100m', () => {
    const target = decideTarget({
      protocols: ['furthest-enemies'],
      scan: [
        { coordinates: { x: 0, y: 50 }, enemies: { type: 'soldier', number: 1 } },
        { coordinates: { x: 0, y: 101 }, enemies: { type: 'soldier', number: 1 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 50 });
  });

  it('accepts a single protocol as a plain string', () => {
    const target = decideTarget({
      protocols: 'closest-enemies',
      scan: [
        { coordinates: { x: 0, y: 30 }, enemies: { type: 'soldier', number: 1 } },
        { coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 1 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 10 });
  });

  it('applies filters before the selector regardless of request order', () => {
    const target = decideTarget({
      protocols: ['closest-enemies', 'avoid-mech'],
      scan: [
        { coordinates: { x: 0, y: 1 }, enemies: { type: 'mech', number: 1 } },
        { coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 1 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 10 });
  });

  it('falls back to closest when only filters are requested', () => {
    const target = decideTarget({
      protocols: ['avoid-mech'],
      scan: [
        { coordinates: { x: 0, y: 60 }, enemies: { type: 'soldier', number: 1 } },
        { coordinates: { x: 0, y: 20 }, enemies: { type: 'soldier', number: 1 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 20 });
  });

  it('assist-allies is a preference: falls back when no ally is present', () => {
    const target = decideTarget({
      protocols: ['assist-allies', 'closest-enemies'],
      scan: [
        { coordinates: { x: 0, y: 30 }, enemies: { type: 'soldier', number: 1 } },
        { coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 1 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 10 });
  });

  it('ignores unknown protocols', () => {
    const target = decideTarget({
      protocols: ['closest-enemies', 'made-up-protocol'],
      scan: [{ coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 1 } }],
    });
    expect(target).toEqual({ x: 0, y: 10 });
  });

  it('returns null when there is nothing legal to engage', () => {
    const target = decideTarget({
      protocols: ['avoid-mech'],
      scan: [{ coordinates: { x: 0, y: 10 }, enemies: { type: 'mech', number: 1 } }],
    });
    expect(target).toBeNull();
  });

  it('ignores points with no enemies (number = 0)', () => {
    const target = decideTarget({
      protocols: ['closest-enemies'],
      scan: [
        { coordinates: { x: 0, y: 5 }, enemies: { type: 'soldier', number: 0 } },
        { coordinates: { x: 0, y: 40 }, enemies: { type: 'soldier', number: 3 } },
      ],
    });
    expect(target).toEqual({ x: 0, y: 40 });
  });
});

describe('explainDecision — pipeline trace', () => {
  it('reports each stage and stays consistent with decideTarget', () => {
    const request: RadarRequest = {
      protocols: ['closest-enemies', 'avoid-mech'],
      scan: [
        { coordinates: { x: 0, y: 1 }, enemies: { type: 'mech', number: 1 } },
        { coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 10 } },
        { coordinates: { x: 0, y: 200 }, enemies: { type: 'soldier', number: 1 } },
      ],
    };

    const { target, trace } = explainDecision(request);

    expect(trace.engageable).toBe(3);
    expect(trace.inRange).toBe(2);
    expect(trace.filters).toEqual([{ name: 'avoid-mech', before: 2, after: 1 }]);
    expect(trace.selector).toBe('closest-enemies');
    expect(trace.candidates).toBe(1);
    expect(trace.target).toEqual({ x: 0, y: 10 });
    expect(target).toEqual(decideTarget(request));
  });

  it('flags the absence of a target and of a selector', () => {
    const { target, trace } = explainDecision({
      protocols: ['closest-enemies'],
      scan: [{ coordinates: { x: 200, y: 200 }, enemies: { type: 'soldier', number: 5 } }],
    });

    expect(target).toBeNull();
    expect(trace.selector).toBeNull();
    expect(trace.inRange).toBe(0);
    expect(trace.target).toBeNull();
  });
});

describe('normalizeProtocols', () => {
  it('wraps a string into an array', () => {
    expect(normalizeProtocols('avoid-mech')).toEqual(['avoid-mech']);
  });

  it('keeps an array as-is', () => {
    expect(normalizeProtocols(['avoid-mech', 'closest-enemies'])).toEqual([
      'avoid-mech',
      'closest-enemies',
    ]);
  });
});
