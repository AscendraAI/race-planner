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
const rpcUrl = process.env.UTNP_SUPABASE_URL || 'https://utnp-smoke.invalid';
const anonKey = process.env.UTNP_SUPABASE_ANON_KEY || 'smoke-anon';
const realRpc = Boolean(process.env.UTNP_SUPABASE_URL && process.env.UTNP_SUPABASE_ANON_KEY);
assert.equal(Boolean(process.env.UTNP_SUPABASE_URL), Boolean(process.env.UTNP_SUPABASE_ANON_KEY), 'Pass URL and anon key together');
const shots = resolve(root, 'docs/utnp/screens');
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
let page;
let localFixture;

function localDb() {
  const url = new URL(rpcUrl);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !Number(url.port)) return null;
  return `postgresql://postgres:postgres@127.0.0.1:${Number(url.port) + 1}/postgres`;
}
function psql(db, variables, sql) {
  const args = [db, '-q'];
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
  if (realRpc && localDb()) {
    const event = await (await fetch(`${base}/events/utnp.json`)).json();
    const db = localDb();
    const slug = `utnp-smoke-${process.pid}`;
    psql(db, { slug, brands: JSON.stringify(event.participatingBrands), questions: JSON.stringify(event.questions), reasons: JSON.stringify(event.reasonOptions) },
      `insert into public.events (slug,name,starts_at,ends_at,disciplines,participating_brands,questions,reason_options,contact_purge_on)
       values (:'slug','UTNP smoke',now()-interval '1 day',now()+interval '30 days','[]'::jsonb,:'brands'::jsonb,:'questions'::jsonb,:'reasons'::jsonb,(now() at time zone 'Asia/Seoul')::date + 45);`);
    localFixture = { db, slug, event };
  }
  if (!rpcOnly) await mkdir(shots, { recursive: true });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const jsErrors = [];
  const adRequests = [];
  const rpcCards = [];
  const rpcErrors = [];
  const mockCards = new Map();
  let eventData;
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('request', r => { if (r.url().includes('adsbygoogle.js')) adRequests.push(r.url()); });
  await page.route('**/assets/event-config.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: `window.RP_EVENT_CONFIG=${JSON.stringify({url: rpcUrl, anonKey})};` }));
  if (localFixture) await page.route('**/events/utnp.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...localFixture.event, slug: localFixture.slug }) }));
  await page.route('https://api.open-meteo.com/v1/forecast**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hourly: {
    apparent_temperature: Array(24).fill(30), temperature_2m: Array(24).fill(27),
    relative_humidity_2m: Array(24).fill(65), wind_speed_10m: Array(24).fill(8)
  } }) }));
  if (!realRpc) {
    await page.route('https://utnp-smoke.invalid/rest/v1/rpc/submit_event_survey', async route => {
      const body = JSON.parse(route.request().postData());
      assert.equal(body.p_slug, 'utnp');
      for (const [key, value] of Object.entries(body.p_answers)) {
        assert.equal(typeof value, 'string');
        assert.ok(eventData.questions[key]?.includes(value), `${key}=${value} is not an event choice`);
      }
      let card = mockCards.get(body.p_device_id);
      if (!card) { card = 'U-0001'; mockCards.set(body.p_device_id, card); }
      rpcCards.push(card);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ card_no: card }) });
    });
  } else {
    page.on('response', async r => {
      if (r.url().endsWith('/rpc/submit_event_survey')) {
        if (r.ok()) rpcCards.push((await r.json()).card_no);
        else rpcErrors.push(`${r.status()} ${(await r.text()).slice(0, 300)}`);
      }
    });
    page.on('requestfailed', r => { if (r.url().endsWith('/rpc/submit_event_survey')) rpcErrors.push(r.failure()?.errorText || 'request failed'); });
  }
  await page.clock.install({ time: new Date('2026-10-30T07:00:00Z') });
  await page.goto(`${base}/gpx/?race=utnp`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ut-step-course').waitFor();
  const shortButtons = await page.locator('#utnp-app button:visible').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim()));
  assert.deepEqual(shortButtons, [], 'All event buttons are at least 44px high');
  const event = await (await fetch(`${base}/events/utnp.json`)).json();
  eventData = event;
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
  await page.locator('[data-discipline="5"]').click();
  await shot(page, 1, 'course');
  await choose(page, 'goalMode', '인덱스');
  await page.locator('#ut-index-value').fill('600');
  await choose(page, 'gender', '여성');
  assert.match(await page.locator('#ut-index-estimate').innerText(), /인덱스 기반 예상치: /);
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
  assert.equal(await page.locator('#ut-submit').isDisabled(), false);
  await page.locator('#ut-step-survey').scrollIntoViewIfNeeded();
  await shot(page, 6, 'survey');
  await page.locator('#ut-submit').click();
  try { await page.locator('.ut-card-no').waitFor({ timeout: 15000 }); }
  catch (e) { throw new Error(`Card unavailable: ${await page.locator('#ut-submit-status').innerText()} | RPC ${rpcErrors.join('; ') || 'no response'}`); }
  const firstCard = await page.locator('.ut-card-no').innerText();
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
  await page.locator('#ut-retry').waitFor({ state: 'visible' });
  assert.ok(await page.evaluate(() => Boolean(localStorage.getItem('rp_utnp_pending'))));
  await page.reload();
  await page.locator('#ut-retry').waitFor({ state: 'visible' });
  await page.locator('#ut-retry').click();
  await page.locator('.ut-card-no').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.ut-card-no').innerText(), firstCard);
  assert.equal(await page.evaluate(() => localStorage.getItem('rp_utnp_pending')), null);
  assert.ok(rpcCards.length >= 3);
  assert.ok(rpcCards.every(v => v === firstCard), 'Same device receives same number');
  assert.equal(adRequests.length, 0, 'No AdSense request in UTNP');
  assert.deepEqual(jsErrors, []);

  if (!rpcOnly) {
    const closed = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await closed.clock.install({ time: new Date('2026-11-03T00:00:00Z') });
    await closed.goto(`${base}/gpx/?race=utnp`);
    await closed.locator('#ut-step-plan').waitFor();
    assert.equal(await closed.locator('#ut-step-survey').count(), 0);
    assert.equal(await closed.locator('#ut-step-booth').count(), 0);
    assert.equal(await closed.locator('#ut-event-closed').count(), 1);
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
    await closed.close(); await normal.close();
  }
  console.log(`PASS 390×844 UTNP steps 1–7, closed period, legacy planner, duplicate device${realRpc ? ', real RPC' : ', mocked RPC'}`);
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
