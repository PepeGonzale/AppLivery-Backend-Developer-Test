// Generates a Postman collection from the official test_cases.txt, one request
// per case with an assertion that compares the exact response string.
//
// The official file is the single source of truth: regenerate the collection
// whenever test_cases.txt changes.
//
// Usage: node scripts/generate-postman-collection.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const casesFile = resolve(root, 'test_cases.txt');
const outFile = resolve(root, 'postman', 'yvh-targeting.postman_collection.json');

function loadCases() {
  return readFileSync(casesFile, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line, index) => {
      const separator = line.indexOf('|');
      if (separator === -1) {
        throw new Error(`Malformed test case at line ${index + 1}: missing "|"`);
      }
      return { input: line.slice(0, separator), expected: line.slice(separator + 1) };
    });
}

function toItem({ input, expected }, index) {
  const n = index + 1;
  return {
    name: `Test ${n}`,
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: '{{baseUrl}}/radar',
      body: {
        mode: 'raw',
        raw: input,
        options: { raw: { language: 'json' } },
      },
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            `pm.test("Test ${n}: exact response", function () {`,
            '  pm.response.to.have.status(200);',
            `  pm.expect(pm.response.text()).to.eql(${JSON.stringify(expected)});`,
            '});',
          ],
        },
      },
    ],
  };
}

const cases = loadCases();

const collection = {
  info: {
    name: 'YVH targeting module (generated from test_cases.txt)',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'One request per official case, each asserting the exact response string. Regenerate with: node scripts/generate-postman-collection.mjs',
  },
  variable: [{ key: 'baseUrl', value: 'http://localhost:8888' }],
  item: cases.map(toItem),
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote ${cases.length} requests to ${outFile}`);
