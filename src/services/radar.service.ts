import { noopLogger, type Logger } from '../config/logger.js';
import { explainDecision } from '../domain/decide-target.js';
import type { RadarRequest, RadarResponse } from '../domain/types.js';
import type { AuditRepository } from '../domain/audit-record.js';

/**
 * Decides and records, in that order: fail-closed, so if the audit write fails
 * the request fails too.
 */
export class RadarService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly logger: Logger = noopLogger,
  ) {}

  async evaluate(request: RadarRequest): Promise<RadarResponse | null> {
    const { target, trace } = explainDecision(request);

    this.logger.debug('range', { engageable: trace.engageable, inRange: trace.inRange });
    for (const step of trace.filters) {
      this.logger.debug('filter', { name: step.name, before: step.before, after: step.after });
    }
    if (trace.selector === null) {
      this.logger.info('no-target');
    } else {
      this.logger.debug('selector', {
        name: trace.selector,
        candidates: trace.candidates,
        target: trace.target,
      });
    }

    const record = await this.auditRepository.record(request, target);
    this.logger.debug('persisted', { id: record.id, engaged: target !== null });

    return target;
  }
}
