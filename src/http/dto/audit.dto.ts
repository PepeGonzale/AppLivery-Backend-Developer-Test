import type { AuditRecord } from '../../domain/audit-record.js';

export interface AuditDto {
  id: string;
  request: unknown;
  response: unknown;
  protocols: string[];
  createdAt: string;
}

export function toAuditDto(record: AuditRecord): AuditDto {
  return {
    id: record.id,
    request: record.request,
    response: record.response,
    protocols: record.protocols,
    createdAt: record.createdAt.toISOString(),
  };
}
