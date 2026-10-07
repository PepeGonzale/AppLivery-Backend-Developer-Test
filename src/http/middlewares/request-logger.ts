import type { RequestHandler } from 'express';

import { noopLogger, type Logger } from '../../config/logger.js';

/** Logs method, path, status and latency when the response finishes. */
export function requestLogger(logger: Logger = noopLogger): RequestHandler {
  return (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      logger.info('request', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - startedAt,
      });
    });

    next();
  };
}
