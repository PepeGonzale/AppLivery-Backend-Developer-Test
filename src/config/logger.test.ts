import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger, noopLogger } from './logger.js';

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drops events below the configured level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('test', 'warn');

    logger.debug('no');
    logger.info('no');
    logger.warn('yes');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain('[warn] [test] yes');
  });

  it('sends errors to stderr and appends the metadata', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('test', 'error');

    logger.error('boom', { code: 1 });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain('[error] [test] boom {"code":1}');
  });
});

describe('noopLogger', () => {
  it('stays silent on every level', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    noopLogger.debug('a');
    noopLogger.info('b');
    noopLogger.warn('c');
    noopLogger.error('d');

    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
