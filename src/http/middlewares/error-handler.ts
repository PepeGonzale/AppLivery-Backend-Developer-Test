import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }

  console.error('[error]', error);
  res.status(500).json({ error: 'Internal server error' });
};
