import type { RadarRequest, RadarResponse } from './types.js';

/**
 * Audited evaluation. Mongoose-free on purpose: lets the HTTP layer run and
 * be tested without a database, and lets storage change without touching it.
 */
export interface AuditRecord {
  id: string;
  request: RadarRequest;
  response: RadarResponse | null;
  protocols: string[];
  createdAt: Date;
}

/**
 * How many of the most recent audit records `GET /audit` returns by default,
 * and the hard cap a caller may request with `?limit=`.
 */
export const DEFAULT_AUDIT_LIMIT = 50;
export const MAX_AUDIT_LIMIT = 200;

/** Persistence port for the audit trail. */
export interface AuditRepository {
  record(request: RadarRequest, response: RadarResponse | null): Promise<AuditRecord>;
  list(limit?: number): Promise<AuditRecord[]>;
  findById(id: string): Promise<AuditRecord | null>;
  remove(id: string): Promise<boolean>;
}
