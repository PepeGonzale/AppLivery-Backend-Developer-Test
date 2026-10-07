import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * request/response are Mixed on purpose: the audit trail must keep the exact
 * payload even if those payloads evolve.
 */
const auditSchema = new Schema(
  {
    request: { type: Schema.Types.Mixed, required: true },
    response: { type: Schema.Types.Mixed, default: null },
    protocols: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
);

export type Audit = InferSchemaType<typeof auditSchema>;
export type AuditDocument = HydratedDocument<Audit>;

export const AuditModel = model('Audit', auditSchema);
