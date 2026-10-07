import type { RequestHandler } from 'express';

import { DEFAULT_AUDIT_LIMIT, MAX_AUDIT_LIMIT, type AuditRepository } from '../../domain/audit-record.js';
import { asyncHandler } from '../async-handler.js';
import { toAuditDto } from '../dto/audit.dto.js';

/**
 * `?limit=` is a convenience for large histories: any missing, non-positive or
 * non-integer value falls back to the default, and the result is capped.
 */
function parseLimit(raw: unknown): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(value) || value <= 0) {
    return DEFAULT_AUDIT_LIMIT;
  }
  return Math.min(value, MAX_AUDIT_LIMIT);
}

export interface AuditController {
  list: RequestHandler;
  detail: RequestHandler;
  remove: RequestHandler;
}

export function createAuditController(auditRepository: AuditRepository): AuditController {
  return {
    list: asyncHandler(async (req, res) => {
      const records = await auditRepository.list(parseLimit(req.query.limit));
      res.json(records.map(toAuditDto));
    }),

    detail: asyncHandler(async (req, res) => {
      const record = await auditRepository.findById(req.params.id ?? '');
      if (!record) {
        res.status(404).json({ error: 'Audit record not found' });
        return;
      }
      res.json(toAuditDto(record));
    }),

    remove: asyncHandler(async (req, res) => {
      const deleted = await auditRepository.remove(req.params.id ?? '');
      if (!deleted) {
        res.status(404).json({ error: 'Audit record not found' });
        return;
      }
      res.status(204).send();
    }),
  };
}
