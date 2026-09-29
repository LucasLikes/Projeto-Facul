create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table public.arenas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cidade text not null,
  telefone_whatsapp text not null default '',
  logo_url text,
  cor_primaria text not null default '#c5f36b' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  retention_days integer not null default 30 check (retention_days between 1 and 365),
  criado_em timestamptz not null default now()
);

create table public.users_arena (
  id uuid not null references auth.users(id) on delete cascade,
  arena_id uuid not null references public.arenas(id) on delete cascade,
  papel text not null check (papel in ('owner', 'staff')),
  primary key (id, arena_id)
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arenas(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  esporte text not null check (esporte in ('futebol_society', 'volei', 'futevolei', 'beach_tennis')),
  tipo text not null check (tipo in ('interna', 'externa')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ativa boolean not null default true,
  unique (arena_id, slug),
  unique (arena_id, nome)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  ultimo_ping timestamptz,
  status text not null default 'offline' check (status in ('online', 'offline', 'revogado')),
  criado_em timestamptz not null default now()
);

create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  preco_centavos integer check (preco_centavos is null or preco_centavos >= 0),
  ativo boolean not null default true,
  check (hora_fim > hora_inicio),
  unique (court_id, dia_semana, hora_inicio, hora_fim)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  nome_cliente text not null,
  whatsapp text not null,
  status text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada', 'bloqueada')),
  origem text not null default 'publica' check (origem in ('publica', 'painel')),
  criado_em timestamptz not null default now(),
  check (hora_fim > hora_inicio),
  check (status = 'bloqueada' or char_length(nome_cliente) between 2 and 100),
  check (status = 'bloqueada' or char_length(whatsapp) between 10 and 20)
);

alter table public.bookings add constraint bookings_no_confirmed_overlap
  exclude using gist (
    court_id with =,
    tsrange(data + hora_inicio, data + hora_fim, '[)') with &&
  ) where (status in ('pendente', 'confirmada', 'bloqueada'));

create table public.replays (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  capturado_em timestamptz not null,
  duracao_s smallint not null check (duracao_s between 1 and 120),
  video_key text not null,
  thumb_key text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  visivel boolean not null default false,
  expira_em timestamptz not null,
  visualizacoes integer not null default 0 check (visualizacoes >= 0),
  compartilhamentos integer not null default 0 check (compartilhamentos >= 0),
  criado_em timestamptz not null default now()
);

create unique index replays_device_capture_unique on public.replays (device_id, capturado_em) where device_id is not null;
create index replays_court_captured_idx on public.replays (court_id, capturado_em desc);
create index replays_expiry_idx on public.replays (expira_em) where visivel = true;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  replay_id uuid not null references public.replays(id) on delete cascade,
  motivo text not null check (char_length(motivo) between 5 and 500),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

create index bookings_court_date_idx on public.bookings (court_id, data);
create index time_slots_court_day_idx on public.time_slots (court_id, dia_semana) where ativo = true;
create index devices_court_idx on public.devices (court_id);
create unique index devices_one_per_court_unique on public.devices (court_id);
create index reports_created_idx on public.reports (criado_em desc) where resolvido_em is null;

create table public.device_rate_limits (
  device_id uuid primary key references public.devices(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

create or replace function public.consume_device_rate_limit(p_device_id uuid, p_limit integer default 30, p_window_seconds integer default 60)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_count integer;
begin
  insert into public.device_rate_limits (device_id, window_started_at, request_count)
  values (p_device_id, now(), 1)
  on conflict (device_id) do update
    set window_started_at = case
          when public.device_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
          else public.device_rate_limits.window_started_at end,
        request_count = case
          when public.device_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
          else public.device_rate_limits.request_count + 1 end
  returning request_count into current_count;
  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_device_rate_limit(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_device_rate_limit(uuid, integer, integer) to service_role;

create or replace function public.user_has_arena_access(target_arena_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users_arena where id = (select auth.uid()) and arena_id = target_arena_id);
$$;
revoke all on function public.user_has_arena_access(uuid) from public;
grant execute on function public.user_has_arena_access(uuid) to authenticated;

create or replace function public.increment_replay_counter(p_replay_id uuid, p_counter text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_counter = 'view' then
    update public.replays set visualizacoes = visualizacoes + 1
      where id = p_replay_id and visivel = true and expira_em > now();
  elsif p_counter = 'share' then
    update public.replays set compartilhamentos = compartilhamentos + 1
      where id = p_replay_id and visivel = true and expira_em > now();
  else
    raise exception 'invalid replay counter';
  end if;
end;
$$;
revoke all on function public.increment_replay_counter(uuid, text) from public, anon, authenticated;
grant execute on function public.increment_replay_counter(uuid, text) to service_role;

alter table public.arenas enable row level security;
alter table public.users_arena enable row level security;
alter table public.courts enable row level security;
alter table public.devices enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.replays enable row level security;
alter table public.reports enable row level security;
alter table public.device_rate_limits enable row level security;

create policy "arena members can read arena" on public.arenas for select to authenticated
  using (public.user_has_arena_access(id));
create policy "arena members can update arena" on public.arenas for update to authenticated
  using (exists (
    select 1 from public.users_arena ua
    where ua.id = (select auth.uid()) and ua.arena_id = arenas.id and ua.papel = 'owner'
  )) with check (exists (
    select 1 from public.users_arena ua
    where ua.id = (select auth.uid()) and ua.arena_id = arenas.id and ua.papel = 'owner'
  ));
create policy "members can read membership" on public.users_arena for select to authenticated
  using (id = (select auth.uid()) or public.user_has_arena_access(arena_id));
create policy "arena members manage courts" on public.courts for all to authenticated
  using (public.user_has_arena_access(arena_id)) with check (public.user_has_arena_access(arena_id));
create policy "arena members manage devices" on public.devices for all to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)));
create policy "arena members manage time slots" on public.time_slots for all to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)));
create policy "arena members manage bookings" on public.bookings for all to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)));
create policy "arena members manage replays" on public.replays for all to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.user_has_arena_access(c.arena_id)));
create policy "arena members review reports" on public.reports for all to authenticated
  using (exists (
    select 1 from public.replays r join public.courts c on c.id = r.court_id
    where r.id = replay_id and public.user_has_arena_access(c.arena_id)
  ))
  with check (exists (
    select 1 from public.replays r join public.courts c on c.id = r.court_id
    where r.id = replay_id and public.user_has_arena_access(c.arena_id)
  ));

grant select, update on public.arenas to authenticated;
grant select on public.users_arena to authenticated;
grant select, insert, update, delete on public.courts, public.devices, public.time_slots, public.bookings, public.replays, public.reports to authenticated;
grant all on public.arenas, public.users_arena, public.courts, public.devices, public.time_slots, public.bookings, public.replays, public.reports, public.device_rate_limits to service_role;

comment on table public.replays is 'Sem leitura anon: acesso publico apenas por rotas server-side com URL assinada.';