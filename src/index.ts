import { createApp } from './app.js';
import { createLogger } from './config/logger.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { MongoAuditRepository } from './repositories/audit.repository.js';
import { RadarService } from './services/radar.service.js';

async function main(): Promise<void> {
  const logger = createLogger('app');

  await connectMongo(env.mongoUri);
  logger.info('mongo connected');

  const auditRepository = new MongoAuditRepository();
  const radarService = new RadarService(auditRepository, createLogger('radar'));
  const app = createApp({ radarService, auditRepository, logger });

  const server = app.listen(env.port, () => {
    logger.info('yvh targeting module listening', { url: `http://localhost:${env.port}` });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('shutting down', { signal });
    server.close();
    await disconnectMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
