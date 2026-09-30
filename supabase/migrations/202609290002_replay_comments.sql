create table public.replay_comments (
  id uuid primary key default gen_random_uuid(),
  replay_id uuid not null references public.replays(id) on delete cascade,
  apelido text not null check (char_length(apelido) between 2 and 32),
  texto text not null check (char_length(texto) between 2 and 500),
  criado_em timestamptz not null default now()
);

create index replay_comments_replay_created_idx on public.replay_comments (replay_id, criado_em desc);

create table public.replay_comment_rate_limits (
  janela_hash text primary key check (janela_hash ~ '^[a-f0-9]{64}$'),
  criado_em timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

create or replace function public.consume_replay_comment_rate_limit(p_janela_hash text, p_limit integer default 5)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_count integer;
begin
  delete from public.replay_comment_rate_limits where criado_em < now() - interval '10 minutes';
  insert into public.replay_comment_rate_limits (janela_hash, criado_em, request_count)
  values (p_janela_hash, now(), 1)
  on conflict (janela_hash) do update
    set request_count = public.replay_comment_rate_limits.request_count + 1
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_replay_comment_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_replay_comment_rate_limit(text, integer) to service_role;

alter table public.replay_comments enable row level security;
alter table public.replay_comment_rate_limits enable row level security;

create policy "arena members manage replay comments" on public.replay_comments for all to authenticated
  using (exists (
    select 1 from public.replays r join public.courts c on c.id = r.court_id
    where r.id = replay_id and public.user_has_arena_access(c.arena_id)
  ))
  with check (exists (
    select 1 from public.replays r join public.courts c on c.id = r.court_id
    where r.id = replay_id and public.user_has_arena_access(c.arena_id)
  ));

grant select, insert, update, delete on public.replay_comments to authenticated;
grant all on public.replay_comments, public.replay_comment_rate_limits to service_role;

comment on table public.replay_comments is 'Comentários públicos associados a um replay ativo; leitura pública somente por rotas server-side.';
comment on table public.replay_comment_rate_limits is 'Hash de IP por minuto, removido após 10 minutos para reduzir spam sem guardar o IP em claro.';