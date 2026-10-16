#!/usr/bin/env node
// Static server + 390 × 844 browser flow. RPC settings are injected in memory.
import { chromium } from '/Users/noi/orca/workspaces/picknow-ops/utnp-event/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const port = 18763;
const base = `http://127.0.0.1:${port}`;
const rpcOnly = process.argv.includes('--rpc-only');
assert.equal(Boolean(process.env.UTNP_SUPABASE_URL), Boolean(process.env.UTNP_SUPABASE_ANON_KEY), 'Pass URL and anon key together');
const picknow = '/Users/noi/orca/workspaces/picknow-ops/utnp-event';
let rpcUrl = process.env.UTNP_SUPABASE_URL;
let anonKey = process.env.UTNP_SUPABASE_ANON_KEY;
let dbUrl;
if (!rpcUrl) {
  // The local stack is the acceptance path; credentials stay in process memory.
  execFileSync('bash', ['scripts/stack.sh', 'up'], { cwd: picknow, stdio: 'ignore' });
  const workdir = execFileSync('bash', ['scripts/stack.sh', 'workdir'], { cwd: picknow, encoding: 'utf8' }).trim();
  const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json', '--workdir', workdir], { cwd: picknow, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  rpcUrl = status.API_URL; anonKey = status.ANON_KEY; dbUrl = status.DB_URL;
}
assert.ok(rpcUrl && anonKey, 'Local Supabase RPC settings required');
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(rpcUrl).hostname), 'Smoke uses a local RPC only');
execFileSync('python3', ['tools/test_rp_lint_banned.py'], { cwd: root, stdio: 'pipe' });
const shots = resolve(root, 'docs/utnp/screens');
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
let page;
let localFixture;

function localDb() {
  const url = new URL(rpcUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !Number(url.port)) return null;
  return dbUrl || `postgresql://postgres:postgres@127.0.0.1:${Number(url.port) + 1}/postgres`;
}
function psql(db, variables, sql) {
  const args = [db, '-q', '-v', 'ON_ERROR_STOP=1'];
  for (const [key, value] of Object.entries(variables)) args.push('-v', `${key}=${value}`);
  execFileSync('psql', args, { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

async function ready() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${base}/events/utnp.json`); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Static server did not start');
}
async function shot(page, n, label) {
  if (rpcOnly) return;
  const section = { course: 'course', goal: 'goal', profile: 'profile', plan: 'plan', share: 'share', survey: 'survey', booth: 'booth' }[label];
  await page.locator(`#ut-step-${section}`).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: resolve(shots, `${n}-${label}.png`) });
}
async function choose(page, group, label) {
  await page.locator(`[data-group="${group}"] [data-choice="${label}"]`).click();
}

try {
  await ready();
  if (localDb()) {
    const event = await (await fetch(`${base}/events/utnp.json`)).json();
    const db = localDb();
    const slug = `utnp-smoke-${process.pid}`;
    const start = new Date(Date.now() - 86400000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();
    const sql = execFileSync('node', ['tools/utnp_event_sql.mjs', '--slug', slug, '--starts-at', start, '--ends-at', end], { cwd: root, encoding: 'utf8' });
    psql(db, {}, sql);
    localFixture = { db, slug, event };
  }
  if (!rpcOnly) await mkdir(shots, { recursive: true });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const jsErrors = [];
  const adRequests = [];
  const rpcCards = [];
  const rpcErrors = [];
  const rpcBodies = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('request', r => { if (r.url().includes('adsbygoogle.js')) adRequests.push(r.url()); });
  page.on('request', r => { if (r.url().endsWith('/rpc/submit_event_survey')) rpcBodies.push(JSON.parse(r.postData())); });
  await page.route('**/assets/event-config.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.RP_EVENT_CONFIG=${JSON.stringify({url: rpcUrl, anonKey})};` }));
  if (localFixture) await page.route('**/events/utnp.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...localFixture.event, slug: localFixture.slug }) }));
  await page.route('https://api.open-meteo.com/v1/forecast**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hourly: {
    apparent_temperature: Array(24).fill(30), temperature_2m: Array(24).fill(27),
    relative_humidity_2m: Array(24).fill(65), wind_speed_10m: Array(24).fill(8)
  } }) }));
  page.on('response', async r => {
    if (r.url().endsWith('/rpc/submit_event_survey')) {
      if (r.ok()) rpcCards.push((await r.json()).card_no);
      else rpcErrors.push(`${r.status()} ${(await r.text()).slice(0, 300)}`);
    }
  });
  page.on('requestfailed', r => { if (r.url().endsWith('/rpc/submit_event_survey')) rpcErrors.push(r.failure()?.errorText || 'request failed'); });
  await page.clock.install({ time: new Date('2026-10-30T07:00:00Z') });
  await page.goto(`${base}/gpx/?race=utnp`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ut-step-course').waitFor();
  const shortButtons = await page.locator('#utnp-app button:visible').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim()));
  assert.deepEqual(shortButtons, [], 'All event buttons are at least 44px high');
  const event = await (await fetch(`${base}/events/utnp.json`)).json();
  const official = { '9': [121.7, 8349, 40, 9], '7': [95.6, 6817, 31, 7], '5': [44.9, 3180, 13, 3], '2': [26, 1874, 8, 1], '1': [12.2, 1090, 4, 2] };
  for (const d of event.disciplines) {
    assert.deepEqual([d.distanceKm, d.ascentM, d.cutoffHours, d.aidStations.length], official[d.id]);
    assert.match(d.officialSource, /^https:\/\/www\.utnp\.kr\/utnp/);
    assert.match(d.indexReference.source, /^https:\/\//);
    const course = await (await fetch(`${base}${d.course}`)).json();
    assert.equal(course.hasEle, true);
    assert.equal(course.pts.length, course.ele.length);
    assert.ok(course.pts.length > 200);
    assert.ok(course.stations.every(s => s.name && Number.isFinite(s.lat) && Number.isFinite(s.lon)));
  }
  assert.equal(await page.locator('#utnp-app a[href]').count(), 0, 'UTNP adds no links');
  assert.doesNotMatch(await page.locator('#utnp-app').innerText(), /올라 레이스 팩|제품 추천/);
  await page.locator('[data-discipline="9"]').click();
  await choose(page, 'goalMode', '인덱스');
  await choose(page, 'gender', '남성');
  await page.locator('#ut-index-value').fill('250');
  const longCourseMin = Number(await page.locator('#ut-index-value').getAttribute('min'));
  assert.ok(longCourseMin > 250, '9PEAKS lower index bound prevents plans over 72 hours');
  await page.locator('#ut-index-value').fill(String(longCourseMin));
  assert.match(await page.locator('#ut-index-estimate').innerText(), /예상 기록/);
  await page.locator('[data-discipline="5"]').click();
  await shot(page, 1, 'course');
  await page.locator('#ut-index-value').fill('600');
  await choose(page, 'gender', '여성');
  assert.match(await page.locator('#ut-index-estimate').innerText(), /인덱스 기반 추정치 · 검증된 환산식이 아닙니다 · 예상 기록/);
  assert.equal(event.indexFactors.ITRA, 1);
  assert.equal(event.indexFactors.UTMB, 1);
  const itraEstimate = await page.locator('#ut-index-estimate').innerText();
  await page.locator('#ut-index-kind').selectOption('UTMB');
  assert.equal(await page.locator('#ut-index-estimate').innerText(), itraEstimate);
  assert.ok(Number(await page.locator('#ut-index-value').getAttribute('min')) >= 1000 * (6 * 3600 + 46 * 60 + 29) / (72 * 3600));
  await page.locator('#ut-step-goal').scrollIntoViewIfNeeded();
  await shot(page, 2, 'goal');
  await choose(page, 'age', '30대');
  await choose(page, 'racePlan', '완주');
  await choose(page, 'sweat', '많음');
  await page.locator('#ut-weather').check();
  await page.locator('#ut-step-profile').scrollIntoViewIfNeeded();
  await shot(page, 3, 'profile');
  await page.locator('#ut-build').click();
  await page.locator('#ut-elevation').waitFor();
  assert.match(await page.locator('#ut-plan-content').innerText(), /총 [\d,]+g/);
  assert.match(await page.locator('#ut-plan-content').innerText(), /날씨 보정/);
  assert.match(await page.locator('#ut-plan-content').innerText(), /인덱스 기반 예상치/);
  assert.equal(await page.evaluate(() => PLAN.waterH), 700);
  assert.equal(await page.evaluate(() => PLAN.naH), 600);
  assert.ok(await page.evaluate(() => PLAN.marks.every(m => m.water === Math.round(PLAN.waterH * PLAN.interval / 60))));
  assert.equal(await page.evaluate(() => PLAN.fluidTot), await page.evaluate(() => Math.round(PLAN.Tadj / 3600 * PLAN.waterH)));
  assert.equal(await page.evaluate(() => window.PLAN.course.dPlus), 3180);
  assert.ok((await page.locator('.ut-aid').count()) >= 3, 'Official aid points highlighted');
  await shot(page, 4, 'plan');
  assert.equal(await page.locator('#rp_canvas').getAttribute('width'), '1080');
  await page.locator('#ut-step-share').scrollIntoViewIfNeeded();
  await shot(page, 5, 'share');
  if (!rpcOnly) {
    const download = page.waitForEvent('download');
    await page.locator('#ut-save-share').click();
    assert.equal((await download).suggestedFilename(), 'utnp-plan.png');
  }
  await choose(page, 'hunger', '보통');
  await choose(page, 'cramp', '가끔');
  await choose(page, 'stomach', '편함');
  await choose(page, 'forms', '마시는 액체형');
  await choose(page, 'caffeine', '후반에만');
  await choose(page, 'tried', '올라 뉴트리션');
  await choose(page, 'curious', '요헤미티');
  await choose(page, 'favorite', '요헤미티');
  await choose(page, 'reasons', '맛');
  await page.locator('#ut-note').fill('다음 행사도 궁금합니다');
  assert.equal(await page.locator('#ut-submit').isDisabled(), false);
  await page.locator('#ut-step-survey').scrollIntoViewIfNeeded();
  await shot(page, 6, 'survey');
  await page.locator('#ut-submit').click();
  try { await page.locator('.ut-card-no').waitFor({ timeout: 15000 }); }
  catch (e) { throw new Error(`Card unavailable: ${await page.locator('#ut-submit-status').innerText()} | RPC ${rpcErrors.join('; ') || 'no response'}`); }
  const firstCard = await page.locator('.ut-card-no').innerText();
  assert.equal(rpcBodies[0].p_favorite_brand, '요헤미티');
  assert.deepEqual(rpcBodies[0].p_reasons, ['맛']);
  assert.ok(['discipline', 'gender', 'age', 'race_plan', 'sweat', 'hunger', 'cramp', 'stomach', 'caffeine', 'form_drink',
    ...Object.values(event.brandAnswerKeys)].every(k => k in rpcBodies[0].p_answers), 'All selected survey questions submitted');
  assert.equal(rpcBodies[0].p_answers.brand_yohemitea, '궁금해요');
  assert.match(firstCard, /^U-\d{4}$/);
  await shot(page, 7, 'booth');
  if (!rpcOnly) {
    const download = page.waitForEvent('download');
    await page.locator('#ut-save-booth').click();
    assert.equal((await download).suggestedFilename(), 'utnp-booth-card.png');
  }
  await page.locator('#ut-submit').click();
  await page.waitForFunction(() => document.querySelector('#ut-submit-status')?.textContent?.includes('부스 카드를 만들었습니다.'));
  assert.equal(await page.locator('.ut-card-no').innerText(), firstCard);
  await page.locator('#ut-contact').fill('01012345678');
  await page.locator('#ut-consent-required').check();
  await page.locator('#ut-save-contact').click();
  await page.waitForFunction(() => document.querySelector('#ut-contact-status')?.textContent?.includes('연락처를 저장했습니다.'), { timeout: 15000 });
  await page.evaluate(() => { window.RP_EVENT_CONFIG.url = '__SUPABASE_URL__'; });
  await page.locator('#ut-submit').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('rp_utnp_pending')), null, 'Placeholder config never stores answers');
  await page.evaluate(url => { window.RP_EVENT_CONFIG.url = url; }, rpcUrl);
  await page.route('**/rest/v1/rpc/submit_event_survey', route => route.abort('failed'));
  await page.locator('#ut-submit').click();
  await page.locator('#ut-retry').waitFor({ state: 'visible' });
  const pending = await page.evaluate(() => localStorage.getItem('rp_utnp_pending'));
  assert.ok(pending);
  assert.ok(!pending.includes('다음 행사도 궁금합니다'), 'Free text excluded from pending body');
  assert.equal(JSON.parse(pending).rpc.p_note, null);
  await page.unroute('**/rest/v1/rpc/submit_event_survey');
  await page.reload();
  await page.locator('#ut-retry').waitFor({ state: 'visible' });
  await page.locator('#ut-retry').click();
  await page.locator('.ut-card-no').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.ut-card-no').innerText(), firstCard);
  assert.equal(await page.evaluate(() => localStorage.getItem('rp_utnp_pending')), null);
  assert.ok(rpcCards.length >= 4);
  assert.ok(rpcCards.every(v => v === firstCard), 'Same device receives same number');
  assert.equal(adRequests.length, 0, 'No AdSense request in UTNP');
  assert.deepEqual(jsErrors, []);

  if (!rpcOnly) {
    const before = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await before.clock.install({ time: new Date('2026-10-29T00:00:00Z') });
    await before.goto(`${base}/gpx/?race=utnp`);
    await before.locator('#ut-event-closed').waitFor();
    assert.match(await before.locator('#ut-event-closed').innerText(), /10\/30에 열립니다/);
    assert.equal(await before.locator('#ut-step-survey').count(), 0);
    assert.equal(await before.locator('#ut-step-booth').count(), 0);
    const closed = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await closed.clock.install({ time: new Date('2026-11-03T00:00:00Z') });
    await closed.addInitScript(() => localStorage.setItem('rp_utnp_pending', JSON.stringify({ rpc: { p_note: '오래된 글' } })));
    await closed.goto(`${base}/gpx/?race=utnp`);
    await closed.locator('#ut-step-plan').waitFor();
    assert.equal(await closed.locator('#ut-step-survey').count(), 0);
    assert.equal(await closed.locator('#ut-step-booth').count(), 0);
    assert.equal(await closed.locator('#ut-event-closed').count(), 1);
    assert.match(await closed.locator('#ut-event-closed').innerText(), /11\/1에 끝났습니다/);
    assert.equal(await closed.evaluate(() => localStorage.getItem('rp_utnp_pending')), null);
    const normal = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await normal.goto(`${base}/gpx/`, { waitUntil: 'domcontentloaded' });
    assert.equal(await normal.locator('#ut-step-course').count(), 0);
    assert.equal(await normal.locator('#drop').isVisible(), true);
    await normal.locator('.preset-chip').first().click();
    await normal.waitForFunction(() => Boolean(window.PLAN));
    const legacyPlan = await normal.evaluate(() => ({ goalSec: PLAN.goalSec, Tadj: Math.round(PLAN.Tadj), carbH: PLAN.carbH,
      gels: PLAN.gels, waterH: PLAN.waterH, naH: PLAN.naH, kms: PLAN.kms.length, firstPace: Math.round(PLAN.kms[0].pace) }));
    assert.deepEqual(legacyPlan, { goalSec: 28800, Tadj: 28800, carbH: 45, gels: 14,
      waterH: 450, naH: 350, kms: 41, firstPace: 429 }); // origin/main 3b92012
    await before.close(); await closed.close(); await normal.close();
  }
  console.log('PASS 390×844 UTNP steps 1–7, before/during/after, legacy planner, duplicate device, real RPC');
  if (!rpcOnly) console.log('Screenshots: docs/utnp/screens/1-course.png … 7-booth.png');
} finally {
  try {
    if (browser) await browser.close();
    if (localFixture) {
      psql(localFixture.db, { slug: localFixture.slug },
        `delete from public.event_contacts where response_id in
           (select r.id from public.event_survey_responses r join public.events e on e.id=r.event_id where e.slug=:'slug');
         delete from public.event_survey_responses where event_id=(select id from public.events where slug=:'slug');
         delete from public.events where slug=:'slug';`);
    }
  } finally { server.kill('SIGTERM'); }
}
