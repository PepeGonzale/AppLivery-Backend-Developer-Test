import { z } from 'zod';

import { PROTOCOL_NAMES } from '../domain/protocols/registry.js';

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const enemiesSchema = z.object({
  type: z.enum(['soldier', 'mech']),
  number: z.number(),
});

const scanPointSchema = z.object({
  coordinates: coordinatesSchema,
  enemies: enemiesSchema,
  allies: z.number().optional(),
});

/**
 * Only known protocols pass; a misspelling is a 400, not a silently ignored
 * restriction.
 */
const protocolNameSchema = z
  .string()
  .refine((name) => PROTOCOL_NAMES.includes(name), { message: 'Unknown protocol' });

export const radarRequestSchema = z.object({
  protocols: z.union([protocolNameSchema, z.array(protocolNameSchema)]),
  scan: z.array(scanPointSchema),
});

export type RadarRequestInput = z.infer<typeof radarRequestSchema>;
