#!/usr/bin/env node
// Count UTNP type-check answers. Product exposure is recomputed by assets/utnp-type.js.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const type = require('../assets/utnp-type.js');
const file = process.argv[2];
const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
const rows = JSON.parse(raw);
if (!Array.isArray(rows)) throw Error('Expected a JSON array of responses');

const byType = {};
for (const key of Object.keys(type.TYPES)) byType[type.TYPES[key].name] = 0;
const bySalt = { true: 0, false: 0 };
const byCramp = { true: 0, false: 0 };
const byCourse = {};
for (const key of Object.keys(type.COURSES)) byCourse[key] = 0;
const productCount = {};
for (const key of Object.keys(type.PRODUCTS)) productCount[key] = 0;

function answersOf(row) {
  if (row && row.p_answers) return row.p_answers;
  if (row && row.answers) return row.answers;
  return row;
}

for (const row of rows) {
  const result = type.compute(answersOf(row));
  byType[result.name] += 1;
  bySalt[result.salt ? 'true' : 'false'] += 1;
  byCramp[result.crampTag ? 'true' : 'false'] += 1;
  byCourse[result.rpcAnswers.course] += 1;
  for (const key of new Set(result.productKeys)) productCount[key] += 1;
}

const byProduct = Object.keys(type.PRODUCTS).map(key => ({
  key, name: type.PRODUCTS[key].n, count: productCount[key]
}));
process.stdout.write(JSON.stringify({
  responses: rows.length, byType, bySalt, byCramp, byCourse, byProduct
}, null, 2) + '\n');
