#!/usr/bin/env node
// Local Pick Now stack + every type-check combination. Does not call production.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '/Users/noi/orca/workspaces/picknow-ops/utnp-event/node_modules/playwright/index.mjs';

const require = createRequire(import.meta.url);
const type = require('../assets/utnp-type.js');
const root = resolve(import.meta.dirname, '..');
const port = 18764;
const base = `http://127.0.0.1:${port}`;
const picknow = '/Users/noi/orca/workspaces/picknow-ops/utnp-event';
const DEFAULT_SQL_SHA256 = '89abebfa23ea49682a418ac3064ecf30c63d1843822214f7fa304744b0f6aca9';
const SHEET_KEYS = ['yowater', 'yogel', 'yocaf', 'gutab', 'guliq', 'guchew', 'vital', 'ollabite', 'amino3', 'olla120', 'cramp', 'amino5', 'hypo', 'medrec', 'medgel', 'aminoshot', 'citric', 'aminogold', 'aminopro', 'crampfix', 'fixgel', 'fixfuel', 'pocari', 'xtreme', 'upfree', 'upcaf', 'upbcaa'];
const FLAVOR_KEYS = ['medcof', 'guorg'];
const WITH_GOAL = ['caf', 'course', 'cramp', 'cramp_tag', 'energy', 'goal', 'result_type', 'rv', 'salt_tag', 'sweat'];
const NO_GOAL = WITH_GOAL.filter(key => key !== 'goal');
const SWEEP_DEVICE = 'rp_typesweep_0001';

function sqlOf(args) {
  return execFileSync('node', ['tools/utnp_event_sql.mjs', ...args], { cwd: root, encoding: 'utf8' });
}
function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const defaultSql = sqlOf([]);
assert.equal(sha256(defaultSql), DEFAULT_SQL_SHA256, 'Default utnp SQL output changed');
assert.equal(sqlOf(['--event', 'events/utnp.json']), defaultSql);
const typeSql = sqlOf(['--event', 'events/utnp-type.json']);
assert.equal(typeSql, readFileSync(resolve(root, 'docs/utnp/utnp-type-event.sql'), 'utf8'));
assert.match(typeSql, /'utnp-type'/);
assert.match(typeSql, /'\[\]'::jsonb/);

const event = JSON.parse(readFileSync(resolve(root, 'events/utnp-type.json'), 'utf8'));
assert.deepEqual(event.questions, type.choiceLists());
assert.deepEqual(event.participatingBrands, []);
assert.deepEqual(event.reasonOptions, []);
assert.deepEqual(event.disciplines, []);
assert.equal(event.startsAtKst, '2026-10-30T00:00+09:00');
assert.equal(event.endsAtKst, '2026-11-02T00:00+09:00');
assert.equal(event.contactPurgeOn, '2026-11-30');
assert.equal(event.maxPerHour, 300);
assert.equal(SHEET_KEYS.length, 27);
assert.deepEqual(Object.keys(type.PRODUCTS).sort(), [...SHEET_KEYS, ...FLAVOR_KEYS].sort());
assert.equal(Boolean(type.PRODUCTS.aminoshot.caf), false);
assert.equal(Boolean(type.PRODUCTS.fixgel.caf), false);
assert.deepEqual(type.caffeineKeys().sort(), ['guorg', 'medcof', 'upcaf', 'yocaf']);
for (const file of ['assets/utnp-type.js', 'assets/utnp-type.css', 'utnp/type/index.html', 'events/utnp-type.json']) {
  const text = readFileSync(resolve(root, file), 'utf8');
  assert.equal(text.includes('uph50'), false, file);
  assert.equal(text.includes('하이드로50'), false, file);
}

const seen = new Set();
const payloads = [];
let kidsCombos = 0;
let otherCombos = 0;
for (const course of Object.keys(type.COURSES)) {
  for (const goal of course === 'KIDS' ? [null] : ['0', '1', '2']) {
    for (const sweat of event.questions.sweat) {
      for (const cramp of event.questions.cramp) {
        for (const energy of event.questions.energy) {
          for (const caf of event.questions.caf) {
            const input = { course, sweat, cramp, energy, caf };
            if (goal !== null) input.goal = goal;
            const result = type.compute(input);
            const rpc = result.rpcAnswers;
            for (const value of Object.values(rpc)) assert.equal(typeof value, 'string');
            assert.deepEqual(Object.keys(rpc).sort(), course === 'KIDS' ? NO_GOAL : WITH_GOAL);
            if (course === 'KIDS') {
              kidsCombos += 1;
              for (const key of type.caffeineKeys()) assert.equal(result.productKeys.includes(key), false, key);
            } else otherCombos += 1;
            for (const key of result.productKeys) seen.add(key);
            for (const [key, value] of Object.entries(rpc)) assert.ok(type.choiceLists()[key].includes(value), `${key}=${value}`);
            payloads.push({
              p_slug: 'utnp-type', p_device_id: SWEEP_DEVICE, p_answers: rpc,
              p_favorite_brand: null, p_reasons: [], p_note: null, p_contact: null,
              p_consent_required: false, p_consent_marketing: false
            });
          }
        }
      }
    }
  }
}
assert.equal(otherCombos, 3456);
assert.equal(kidsCombos, 192);
assert.equal(payloads.length, 3648);
assert.deepEqual(Object.keys(type.PRODUCTS).filter(key => !seen.has(key)), []);

const reportCounts = { medgel: 1, medcof: 1, vital: 2, upfree: 1, ollabite: 1, olla120: 2, amino3: 1, hypo: 1, yogel: 1, yocaf: 1, guliq: 1, guorg: 1, yowater: 2, gutab: 2, cramp: 1, medrec: 2, upbcaa: 2, amino5: 2, aminoshot: 1, fixgel: 1, xtreme: 1, guchew: 1, fixfuel: 1, pocari: 2, citric: 2, crampfix: 1, upcaf: 1, aminogold: 2, aminopro: 2 };
const reportDir = mkdtempSync(resolve(tmpdir(), 'utnp-type-report-'));
const reportFile = resolve(reportDir, 'responses.json');
writeFileSync(reportFile, JSON.stringify([
  { course: '9PEAKS', goal: '0', sweat: '자주', cramp: '1~2번', energy: '후반까지 힘이 버티는 것', caf: '좋아요' },
  { answers: { course: 'KIDS', sweat: '거의 없어요', cramp: '없어요', energy: '잘 모르겠어요', caf: '좋아요' } }
]));
const report = JSON.parse(execFileSync('node', ['tools/utnp_type_report.mjs', reportFile], { cwd: root, encoding: 'utf8' }));
assert.equal(report.responses, 2);
assert.equal(report.byType['롱런 연료형'], 1);
assert.equal(report.byType['편한 속형'], 0);
assert.equal(report.byType['내추럴형'], 0);
assert.equal(report.byType['밸런스형'], 1);
assert.deepEqual(report.bySalt, { true: 1, false: 1 });
assert.deepEqual(report.byCramp, { true: 1, false: 1 });
assert.equal(report.byCourse['9PEAKS'], 1);
assert.equal(report.byCourse.KIDS, 1);
assert.equal(report.byCourse['1PEAK'], 0);
assert.deepEqual(report.byProduct, Object.keys(type.PRODUCTS).map(key => ({ key, name: type.PRODUCTS[key].n, count: reportCounts[key] })));
assert.equal(report.byProduct.find(row => row.key === 'fixfuel').name, '픽스 퓨얼 엑스 프로 55G 엔듀어런스 퓨엘 믹스 파우더');
assert.equal(report.byProduct.some(row => row.key === 'uph50'), false);

let rpcUrl = process.env.UTNP_SUPABASE_URL;
let anonKey = process.env.UTNP_SUPABASE_ANON_KEY;
let dbUrl;
if (!rpcUrl) {
  execFileSync('bash', ['scripts/stack.sh', 'up'], { cwd: picknow, stdio: 'ignore' });
  const workdir = execFileSync('bash', ['scripts/stack.sh', 'workdir'], { cwd: picknow, encoding: 'utf8' }).trim();
  const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json', '--workdir', workdir], { cwd: picknow, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  rpcUrl = status.API_URL; anonKey = status.ANON_KEY; dbUrl = status.DB_URL;
}
assert.ok(rpcUrl && anonKey, 'Local Supabase RPC settings required');
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(rpcUrl).hostname), 'Smoke uses a local RPC only');

function localDb() {
  const url = new URL(rpcUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !Number(url.port)) return null;
  return dbUrl || `postgresql://postgres:postgres@127.0.0.1:${Number(url.port) + 1}/postgres`;
}
function psql(db, variables, sql, tuples) {
  const args = [db, '-v', 'ON_ERROR_STOP=1'];
  if (tuples) args.push('-t', '-A');
  else args.push('-q');
  for (const [key, value] of Object.entries(variables)) args.push('-v', `${key}=${value}`);
  return execFileSync('psql', args, { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
const db = localDb();
assert.ok(db, 'Local database URL required');
const wipeSql = `delete from public.event_contacts where response_id in
  (select r.id from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug');
 delete from public.event_survey_responses where event_id=(select id from public.events where slug=:'slug');
 delete from public.events where slug=:'slug';`;
psql(db, { slug: 'utnp-type' }, wipeSql);
const start = new Date(Date.now() - 86400000).toISOString();
const end = new Date(Date.now() + 86400000).toISOString();
psql(db, {}, sqlOf(['--event', 'events/utnp-type.json', '--starts-at', start, '--ends-at', end]));

async function mapPool(items, limit, fn) {
  const errors = [];
  let cursor = 0;
  async function worker() {
    while (errors.length < 5) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try { await fn(items[index], index); }
      catch (error) { errors.push(error); }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  if (errors.length) throw new Error(errors.slice(0, 5).map(error => error.message).join('\n'));
}

const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  let sweepCard = '';
  await mapPool(payloads, 4, async (body, index) => {
    if (index > 0 && index % 500 === 0) console.log(`rpc ${index}/${payloads.length}`);
    const response = await fetch(rpcUrl.replace(/\/$/, '') + '/rest/v1/rpc/submit_event_survey', {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: 'Bearer ' + anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 240)} ${JSON.stringify(body.p_answers)}`);
    const card = JSON.parse(text).card_no;
    if (!/^U-\d{4,}$/.test(card)) throw new Error('card ' + text);
    if (!sweepCard) sweepCard = card;
    else if (card !== sweepCard) throw new Error(`card changed ${sweepCard} -> ${card}`);
  });
  assert.equal(Number(psql(db, { slug: 'utnp-type', device: SWEEP_DEVICE },
    `select count(*) from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug' and r.device_id=:'device';`, true)), 1);

  for (let i = 0; i < 50; i++) {
    try { const ready = await fetch(`${base}/utnp/type/`); if (ready.ok) break; } catch {}
    if (i === 49) throw new Error('Static server did not start');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const shots = resolve(root, 'docs/utnp/type-screens');
  mkdirSync(shots, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const jsErrors = [];
  const adRequests = [];
  const bodies = [];
  page.on('pageerror', error => jsErrors.push(error.message));
  page.on('request', request => { if (request.url().includes('adsbygoogle.js')) adRequests.push(request.url()); });
  page.on('request', request => {
    if (request.url().endsWith('/rpc/submit_event_survey')) bodies.push(JSON.parse(request.postData()));
  });
  async function arm(target) {
    await target.route('**/assets/event-config.js', route => route.fulfill({
      status: 200, contentType: 'application/javascript',
      body: `window.RP_EVENT_CONFIG=${JSON.stringify({ url: rpcUrl, anonKey })};`
    }));
  }
  async function pick(target, value) {
    const button = target.locator('#questions .screen.on .opt[data-v="' + value.replaceAll('"', '\\"') + '"]');
    await button.waitFor();
    await button.click();
  }
  async function flow(target, values) {
    await target.locator('#s-intro.on').waitFor();
    await target.locator('#start').click();
    for (const value of values) await pick(target, value);
    await target.locator('#s-result.on').waitFor();
  }
  await arm(page);
  await page.goto(`${base}/utnp/type/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(shots, '1-start.png') });
  await page.locator('#start').click();
  await page.locator('#questions .screen.on').waitFor();
  assert.equal(await page.locator('#step').innerText(), '1 / 6');
  await page.screenshot({ path: resolve(shots, '2-question.png') });
  for (const value of ['9PEAKS', '0', '거의 없어요', '없어요', '후반까지 힘이 버티는 것', '좋아요']) await pick(page, value);
  await page.locator('#s-result.on').waitFor();
  for (let i = 0; i < 40 && bodies.length < 1; i++) await new Promise(r => setTimeout(r, 50));
  assert.ok(bodies.length >= 1, 'Fuel survey did not call RPC');
  assert.match(await page.locator('#s-result').innerText(), /롱런 연료형/);
  assert.match(await page.locator('#s-result').innerText(), /아미노바이탈 아미노샷 퍼펙트 에너지젤/);
  assert.doesNotMatch(await page.locator('#s-result').innerText(), /하이드로50/);
  assert.match(await page.locator('#s-result').innerText(), /이 화면을 부스 직원에게 보여 주세요/);
  await page.screenshot({ path: resolve(shots, '3-fuel.png') });
  const fuel = bodies[0];
  assert.equal(fuel.p_slug, 'utnp-type');
  assert.equal(fuel.p_answers.course, '9PEAKS');
  assert.equal(fuel.p_answers.goal, '0');
  assert.equal(fuel.p_answers.result_type, 'fuel');
  assert.equal(fuel.p_answers.salt_tag, 'false');
  assert.equal(fuel.p_answers.cramp_tag, 'false');
  assert.equal(fuel.p_answers.rv, '1');
  assert.equal(fuel.p_favorite_brand, null);
  assert.deepEqual(fuel.p_reasons, []);
  assert.equal(fuel.p_note, null);
  assert.equal(fuel.p_contact, null);
  assert.equal(fuel.p_consent_required, false);
  assert.equal(fuel.p_consent_marketing, false);
  await page.locator('#restart').click();
  await flow(page, ['9PEAKS', '0', '거의 없어요', '없어요', '속이 편한 것', '안 먹어요']);
  assert.match(await page.locator('#r-name').innerText(), /편한 속형/);
  await page.screenshot({ path: resolve(shots, '4-gut.png') });
  await page.locator('#restart').click();
  await flow(page, ['5PEAKS', '0', '가끔', '날 뻔한 적만', '꿀·메이플 같은 원료', '후반에만']);
  assert.match(await page.locator('#r-name').innerText(), /내추럴형/);
  await page.screenshot({ path: resolve(shots, '5-natural.png') });
  await page.locator('#restart').click();
  await flow(page, ['1PEAK', '0', '거의 없어요', '없어요', '잘 모르겠어요', '안 먹어요']);
  assert.match(await page.locator('#r-name').innerText(), /밸런스형/);
  assert.match(await page.locator('#s-result').innerText(), /익스트림 엑티브 에너지젤/);
  await page.screenshot({ path: resolve(shots, '6-balance.png') });
  assert.equal(adRequests.length, 0, 'No AdSense request');
  assert.equal((await page.content()).includes('adsbygoogle'), false);
  assert.match(await page.content(), /G-B0C2N8Q89V/);
  assert.deepEqual(jsErrors, []);

  const blocked = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const blockedErrors = [];
  blocked.on('pageerror', error => blockedErrors.push(error.message));
  await arm(blocked);
  await blocked.route('**/rest/v1/rpc/submit_event_survey', route => route.abort('failed'));
  await blocked.goto(`${base}/utnp/type/`, { waitUntil: 'domcontentloaded' });
  await flow(blocked, ['KIDS', '거의 없어요', '없어요', '후반까지 힘이 버티는 것', '안 먹어요']);
  assert.match(await blocked.locator('#r-name').innerText(), /롱런 연료형/);
  assert.match(await blocked.locator('#s-result').innerText(), /카페인 제품은 결과에서 뺐어요/);
  assert.match(await blocked.locator('#s-result').innerText(), /아미노바이탈 아미노샷 퍼펙트 에너지젤/);
  assert.doesNotMatch(await blocked.locator('#s-result').innerText(), /커피앤허니|카페인 110|에너지 오렌지|러닝 에너지젤 카페인/);
  await blocked.waitForFunction(() => localStorage.getItem('rp_utnp_type_pending'));
  const pending = JSON.parse(await blocked.evaluate(() => localStorage.getItem('rp_utnp_type_pending')));
  const device = await blocked.evaluate(() => localStorage.getItem('rp_utnp_device_id'));
  assert.equal('goal' in pending.p_answers, false);
  assert.equal(pending.p_answers.course, 'KIDS');
  assert.equal(pending.p_device_id, device);
  assert.equal(Number(psql(db, { slug: 'utnp-type', device },
    `select count(*) from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug' and r.device_id=:'device';`, true)), 0);
  await blocked.unroute('**/rest/v1/rpc/submit_event_survey');
  const retryBodies = [];
  blocked.on('request', request => {
    if (request.url().endsWith('/rpc/submit_event_survey')) retryBodies.push(JSON.parse(request.postData()));
  });
  await blocked.reload({ waitUntil: 'domcontentloaded' });
  await blocked.waitForFunction(() => localStorage.getItem('rp_utnp_type_pending') === null, { timeout: 15000 });
  assert.equal(Number(psql(db, { slug: 'utnp-type', device },
    `select count(*) from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug' and r.device_id=:'device';`, true)), 1);
  await flow(blocked, ['1PEAK', '1', '자주', '자주(거의 매번)', '속이 편한 것', '좋아요']);
  await blocked.waitForFunction(() => localStorage.getItem('rp_utnp_type_pending') === null);
  assert.equal(Number(psql(db, { slug: 'utnp-type', device },
    `select count(*) from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug' and r.device_id=:'device';`, true)), 1);
  assert.equal(retryBodies[0].p_answers.course, 'KIDS');
  assert.equal('goal' in retryBodies[0].p_answers, false);
  assert.equal(retryBodies[1].p_answers.goal, '1');
  assert.deepEqual(blockedErrors, []);
  console.log('PASS utnp-type 3648 RPC, 27 products, kids, retry, same device, 390×844');
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { psql(db, { slug: 'utnp-type' }, wipeSql); } catch (error) { console.error(error); }
  server.kill('SIGTERM');
}
