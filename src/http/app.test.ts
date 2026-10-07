import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { DEFAULT_AUDIT_LIMIT, type AuditRecord, type AuditRepository } from '../domain/audit-record.js';
import { normalizeProtocols } from '../domain/decide-target.js';
import type { RadarRequest, RadarResponse } from '../domain/types.js';
import { RadarService } from '../services/radar.service.js';

/** In-memory `AuditRepository`, so the HTTP layer is tested without Mongo. */
class InMemoryAuditRepository implements AuditRepository {
  private records: AuditRecord[] = [];
  private sequence = 0;

  async record(request: RadarRequest, response: RadarResponse | null): Promise<AuditRecord> {
    this.sequence += 1;
    const record: AuditRecord = {
      id: `audit-${this.sequence}`,
      request,
      response,
      protocols: normalizeProtocols(request.protocols),
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }

  async list(limit: number = DEFAULT_AUDIT_LIMIT): Promise<AuditRecord[]> {
    return [...this.records]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async findById(id: string): Promise<AuditRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.records.length;
    this.records = this.records.filter((record) => record.id !== id);
    return this.records.length < before;
  }
}

interface OfficialCase {
  position: number;
  input: RadarRequest;
  expected: string;
}

function loadOfficialCases(): OfficialCase[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const casesPath = resolve(here, '../../test_cases.txt');

  return readFileSync(casesPath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .map((line, index) => {
      const [rawInput, rawExpected] = line.split('|');
      if (rawInput === undefined || rawExpected === undefined) {
        throw new Error(`Malformed test case at line ${index + 1}`);
      }
      return { position: index + 1, input: JSON.parse(rawInput) as RadarRequest, expected: rawExpected };
    });
}

function buildApp() {
  const auditRepository = new InMemoryAuditRepository();
  const radarService = new RadarService(auditRepository);
  const app = createApp({ radarService, auditRepository });
  return { app, auditRepository };
}

describe('POST /radar — official cases over HTTP', () => {
  const cases = loadOfficialCases();

  it.each(cases)('case #$position responds with the exact body $expected', async ({ input, expected }) => {
    const { app } = buildApp();
    const response = await request(app).post('/radar').send(input);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.text).toBe(expected);
  });
});

describe('POST /radar — request validation', () => {
  it('rejects a malformed body with 400', async () => {
    const { app } = buildApp();
    const response = await request(app).post('/radar').send({ protocols: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid radar request');
  });

  it('rejects an unknown protocol with 400 (fail closed)', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/radar')
      .send({
        protocols: ['closest-enemies', 'made-up-protocol'],
        scan: [{ coordinates: { x: 0, y: 10 }, enemies: { type: 'soldier', number: 1 } }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid radar request');
  });

  it('rejects invalid JSON with 400', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/radar')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');

    expect(response.status).toBe(400);
  });

  it('returns null when there is nothing legal to engage', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/radar')
      .send({
        protocols: ['avoid-mech'],
        scan: [{ coordinates: { x: 0, y: 10 }, enemies: { type: 'mech', number: 1 } }],
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('null');
  });
});

describe('audit endpoints', () => {
  let app: ReturnType<typeof buildApp>['app'];

  beforeEach(() => {
    app = buildApp().app;
  });

  it('records every radar evaluation and lists them', async () => {
    await request(app)
      .post('/radar')
      .send({
        protocols: ['closest-enemies'],
        scan: [{ coordinates: { x: 0, y: 30 }, enemies: { type: 'soldier', number: 1 } }],
      });

    const list = await request(app).get('/audit');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].response).toEqual({ x: 0, y: 30 });
  });

  it('returns a single record by id', async () => {
    await request(app)
      .post('/radar')
      .send({
        protocols: ['closest-enemies'],
        scan: [{ coordinates: { x: 0, y: 30 }, enemies: { type: 'soldier', number: 1 } }],
      });

    const record = await request(app).get('/audit/audit-1');
    expect(record.status).toBe(200);
    expect(record.body.id).toBe('audit-1');
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app).get('/audit/does-not-exist');
    expect(response.status).toBe(404);
  });

  it('deletes a record and then reports it as gone', async () => {
    await request(app)
      .post('/radar')
      .send({
        protocols: ['closest-enemies'],
        scan: [{ coordinates: { x: 0, y: 30 }, enemies: { type: 'soldier', number: 1 } }],
      });

    const deleted = await request(app).delete('/audit/audit-1');
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app).get('/audit/audit-1');
    expect(afterDelete.status).toBe(404);
  });

  it('returns 404 when deleting an unknown id', async () => {
    const response = await request(app).delete('/audit/does-not-exist');
    expect(response.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('reports the service as up', async () => {
    const { app } = buildApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('responds 404 as JSON, not the Express default HTML', async () => {
    const { app } = buildApp();
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('does not advertise the framework via X-Powered-By', async () => {
    const { app } = buildApp();
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /audit limit', () => {
  async function seed(app: ReturnType<typeof buildApp>['app'], count: number) {
    for (let index = 0; index < count; index += 1) {
      await request(app)
        .post('/radar')
        .send({
          protocols: ['closest-enemies'],
          scan: [{ coordinates: { x: 0, y: 10 + index }, enemies: { type: 'soldier', number: 1 } }],
        });
    }
  }

  it('caps the listing at ?limit=', async () => {
    const { app } = buildApp();
    await seed(app, 3);

    const response = await request(app).get('/audit?limit=2');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('falls back to the default for an invalid limit', async () => {
    const { app } = buildApp();
    await seed(app, 3);

    const response = await request(app).get('/audit?limit=abc');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });
});
