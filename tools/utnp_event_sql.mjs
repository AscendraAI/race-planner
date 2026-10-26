#!/usr/bin/env node
// Print the Pick Now events upsert from the public UTNP event definition.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const allowed = new Set(['--event', '--slug', '--starts-at', '--ends-at']);
const overrides = {};
for (let i = 0; i < args.length; i += 2) {
  if (!allowed.has(args[i]) || !args[i + 1]) throw Error('Usage: utnp_event_sql.mjs [--event events/file.json] [--slug value] [--starts-at ISO] [--ends-at ISO]');
  overrides[args[i]] = args[i + 1];
}
const eventPath = overrides['--event']
  ? resolve(overrides['--event'])
  : resolve(import.meta.dirname, '../events/utnp.json');
const event = JSON.parse(readFileSync(eventPath, 'utf8'));
const slug = overrides['--slug'] || event.slug;
const starts = overrides['--starts-at'] || event.startsAtKst;
const ends = overrides['--ends-at'] || event.endsAtKst;
if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug) || !Number.isFinite(Date.parse(starts)) || !Number.isFinite(Date.parse(ends)) || Date.parse(ends) <= Date.parse(starts)) throw Error('Invalid event slug or period');
if (!Number.isInteger(event.maxPerHour) || event.maxPerHour <= 0) throw Error('Invalid hourly cap');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => quote(JSON.stringify(value)) + '::jsonb';
const columns = ['slug', 'name', 'starts_at', 'ends_at', 'disciplines', 'participating_brands', 'questions', 'reason_options', 'contact_purge_on', 'max_per_hour'];
const values = [quote(slug), quote(event.name), quote(starts) + '::timestamptz', quote(ends) + '::timestamptz',
  json((event.disciplines || []).map(d => d.name)), json(event.participatingBrands), json(event.questions), json(event.reasonOptions),
  quote(event.contactPurgeOn) + '::date', String(event.maxPerHour)];
process.stdout.write(`insert into public.events (${columns.join(', ')})\nvalues (${values.join(', ')})\non conflict (slug) do update set\n` +
  columns.slice(1).map(c => `  ${c} = excluded.${c}`).join(',\n') + ';\n');
