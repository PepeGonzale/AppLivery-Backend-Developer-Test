import { isValidObjectId } from 'mongoose';

import { DEFAULT_AUDIT_LIMIT, type AuditRecord, type AuditRepository } from '../domain/audit-record.js';
import { normalizeProtocols } from '../domain/decide-target.js';
import type { RadarRequest, RadarResponse } from '../domain/types.js';
import { AuditModel, type AuditDocument } from '../models/audit.model.js';

/**
 * MongoDB adapter for the audit port. This is the only place that knows about
 * Mongoose documents; everything upstream sees plain `AuditRecord`s.
 */
export class MongoAuditRepository implements AuditRepository {
  async record(request: RadarRequest, response: RadarResponse | null): Promise<AuditRecord> {
    const document = await AuditModel.create({
      request,
      response,
      protocols: normalizeProtocols(request.protocols),
    });
    return this.toRecord(document);
  }

  async list(limit: number = DEFAULT_AUDIT_LIMIT): Promise<AuditRecord[]> {
    const documents = await AuditModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return documents.map((document) => this.toRecord(document));
  }

  async findById(id: string): Promise<AuditRecord | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    const document = await AuditModel.findById(id).exec();
    return document ? this.toRecord(document) : null;
  }

  async remove(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) {
      return false;
    }
    const result = await AuditModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  private toRecord(document: AuditDocument): AuditRecord {
    return {
      id: document.id,
      request: document.request as RadarRequest,
      response: (document.response ?? null) as RadarResponse | null,
      protocols: document.protocols,
      createdAt: document.createdAt ?? new Date(),
    };
  }
}
