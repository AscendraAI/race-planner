insert into public.events (slug, name, starts_at, ends_at, disciplines, participating_brands, questions, reason_options, contact_purge_on, max_per_hour)
values ('utnp-type', '2026 UTNP 유형 체크', '2026-10-30T00:00+09:00'::timestamptz, '2026-11-02T00:00+09:00'::timestamptz, '[]'::jsonb, '[]'::jsonb, '{"course":["9PEAKS","7PEAKS","5PEAKS","2PEAKS","1PEAK","KIDS","OTHER"],"goal":["0","1","2"],"sweat":["거의 없어요","가끔","자주","거의 매번"],"cramp":["없어요","날 뻔한 적만","1~2번","자주(거의 매번)"],"energy":["후반까지 힘이 버티는 것","속이 편한 것","꿀·메이플 같은 원료","잘 모르겠어요"],"caf":["좋아요","후반에만","안 먹어요"],"result_type":["fuel","gut","natural","balance"],"salt_tag":["true","false"],"cramp_tag":["true","false"],"rv":["1"]}'::jsonb, '[]'::jsonb, '2026-11-30'::date, 300)
on conflict (slug) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  disciplines = excluded.disciplines,
  participating_brands = excluded.participating_brands,
  questions = excluded.questions,
  reason_options = excluded.reason_options,
  contact_purge_on = excluded.contact_purge_on,
  max_per_hour = excluded.max_per_hour;
