alter table public.arenas
  add column if not exists publicidade_ativa boolean not null default false,
  add column if not exists publicidade_titulo text,
  add column if not exists publicidade_texto text,
  add column if not exists publicidade_imagem_url text,
  add column if not exists publicidade_whatsapp text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'arenas_publicidade_whatsapp_format') then
    alter table public.arenas add constraint arenas_publicidade_whatsapp_format
      check (publicidade_whatsapp ~ '^[+0-9 ()-]*$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'arenas_publicidade_titulo_length') then
    alter table public.arenas add constraint arenas_publicidade_titulo_length
      check (publicidade_titulo is null or char_length(publicidade_titulo) <= 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'arenas_publicidade_texto_length') then
    alter table public.arenas add constraint arenas_publicidade_texto_length
      check (publicidade_texto is null or char_length(publicidade_texto) <= 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'arenas_publicidade_required_content') then
    alter table public.arenas add constraint arenas_publicidade_required_content
      check (not publicidade_ativa or (nullif(trim(publicidade_titulo), '') is not null and nullif(trim(publicidade_texto), '') is not null));
  end if;
end;
$$;