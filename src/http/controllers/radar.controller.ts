import type { RequestHandler } from 'express';

import type { RadarService } from '../../services/radar.service.js';
import { radarRequestSchema } from '../../validation/radar.schema.js';
import { asyncHandler } from '../async-handler.js';

export function createRadarController(radarService: RadarService): RequestHandler {
  return asyncHandler(async (req, res) => {
    const parsed = radarRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid radar request',
        details: parsed.error.flatten(),
      });
      return;
    }

    const target = await radarService.evaluate(parsed.data);
    // No legal target -> 200 with a null body. Documented design decision:
    // the scan was processed correctly, there is simply nothing to engage.
    res.status(200).json(target);
  });
}
