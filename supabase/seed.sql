insert into public.arenas (id, nome, slug, cidade, telefone_whatsapp, cor_primaria)
values ('10000000-0000-4000-8000-000000000001', 'Arena Teste', 'arena-teste', 'Sao Paulo', '5511999999999', '#c5f36b')
on conflict (id) do nothing;

insert into public.courts (id, arena_id, nome, esporte, tipo, slug, ativa) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Society 1', 'futebol_society', 'externa', 'society-1', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Society 2', 'futebol_society', 'externa', 'society-2', true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Volei Externo 1', 'volei', 'externa', 'volei-externo-1', true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Volei Externo 2', 'volei', 'externa', 'volei-externo-2', true)
on conflict (id) do nothing;

insert into public.time_slots (court_id, dia_semana, hora_inicio, hora_fim, ativo)
select courts.id, weekdays.day, starts.hour::time, (starts.hour + interval '1 hour')::time, true
from public.courts
cross join generate_series(0, 6) as weekdays(day)
cross join generate_series(timestamp '2000-01-01 17:00', timestamp '2000-01-01 22:00', interval '1 hour') as starts(hour)
where courts.arena_id = '10000000-0000-4000-8000-000000000001'
on conflict (court_id, dia_semana, hora_inicio, hora_fim) do nothing;

insert into public.replays (court_id, capturado_em, duracao_s, video_key, thumb_key, tamanho_bytes, visivel, expira_em)
select
  ('20000000-0000-4000-8000-00000000000' || ((sample.n % 4) + 1)::text)::uuid,
  ((now() at time zone 'America/Sao_Paulo')::date - (sample.n % 3) + time '17:00'
    + (((sample.n * 13) % 6) * interval '1 hour') + (((sample.n * 7) % 50) * interval '1 minute'))
    at time zone 'America/Sao_Paulo',
  35,
  'demo/replay-' || lpad(sample.n::text, 2, '0') || '.mp4',
  'demo/thumb-' || lpad(sample.n::text, 2, '0') || '.svg',
  24000000,
  true,
  now() + interval '30 days'
from generate_series(1, 20) as sample(n)
where not exists (
  select 1 from public.replays existing
  where existing.video_key = 'demo/replay-' || lpad(sample.n::text, 2, '0') || '.mp4'
);