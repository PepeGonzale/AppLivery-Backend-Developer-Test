import express, { type Express } from 'express';

import { noopLogger, type Logger } from './config/logger.js';
import { createAuditController } from './http/controllers/audit.controller.js';
import { createRadarController } from './http/controllers/radar.controller.js';
import { errorHandler } from './http/middlewares/error-handler.js';
import { requestLogger } from './http/middlewares/request-logger.js';
import type { AuditRepository } from './domain/audit-record.js';
import type { RadarService } from './services/radar.service.js';

export interface AppDependencies {
  radarService: RadarService;
  auditRepository: AuditRepository;
  logger?: Logger;
}

export function createApp({ radarService, auditRepository, logger = noopLogger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger(logger));
  app.use(express.json());

  const radarController = createRadarController(radarService);
  const auditController = createAuditController(auditRepository);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.post('/radar', radarController);
  app.get('/audit', auditController.list);
  app.get('/audit/:id', auditController.detail);
  app.delete('/audit/:id', auditController.remove);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
