-- Sprint 2 · medir sin datos personales.
-- - clientes.ultimo_ingreso: lo marca ws_registrar_ingreso() como mucho una vez al día (hora de Lima)
--   cuando el usuario de la empresa entra a su workspace; ws_mi_empresa() lo devuelve para no llamar de más.
-- - leads.origen / referente / utm: de dónde llegó quien escribe (crear_lead recibe p_origen).
-- - eventos_landing: conteos por día, evento y origen (clics en WhatsApp y correo, formulario enviado).
--   Sin una fila por visitante, sin IP ni user agent. Solo lo escribe registrar_evento().
-- Compatible con el código publicado: crear_lead conserva sus parámetros y p_origen tiene valor por defecto.

-- ---------------------------------------------------------------------
-- 1. Último ingreso de la empresa a su workspace
-- ---------------------------------------------------------------------
alter table public.clientes add column if not exists ultimo_ingreso timestamptz;

create or replace function public.ws_mi_empresa()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'slug', c.slug,
    'modulos', to_jsonb(c.modulos),
    'contacto', c.contacto,
    'ultimo_ingreso', c.ultimo_ingreso,
    'marca', (select jsonb_build_object('nombre_comercial', pm.nombre_comercial, 'responsable', pm.responsable, 'telefono', pm.telefono, 'correo', pm.correo)
              from public.perfil_marca pm where pm.owner_id = c.owner_id)
  )
  from public.clientes c
  where c.usuario_id = auth.uid() and c.activa
  limit 1;
$$;

-- Marca el ingreso de hoy de la empresa del usuario. Devuelve true si escribió (una vez al día como mucho).
create or replace function public.ws_registrar_ingreso()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_n int;
begin
  update public.clientes c
  set ultimo_ingreso = now()
  where c.usuario_id = auth.uid()
    and c.activa
    and (c.ultimo_ingreso is null
         or (c.ultimo_ingreso at time zone 'America/Lima')::date < (now() at time zone 'America/Lima')::date);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke all on function public.ws_registrar_ingreso() from public, anon;
grant execute on function public.ws_registrar_ingreso() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Origen del lead
-- ---------------------------------------------------------------------
-- Origen clasificado por la app (lista cerrada); referente = solo el dominio; utm = source/medium/campaign.
alter table public.leads add column if not exists origen text;
alter table public.leads add column if not exists referente text;
alter table public.leads add column if not exists utm jsonb;

alter table public.leads drop constraint if exists leads_origen_valido;
alter table public.leads add constraint leads_origen_valido check (
  origen is null or origen in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo')
);
alter table public.leads drop constraint if exists leads_referente_largo;
alter table public.leads add constraint leads_referente_largo check (referente is null or length(referente) <= 100);

-- Sin sobrecargas de nombre (scripts/lib/funciones-sql.mjs): se borra la firma vieja antes de crear la nueva.
drop function if exists public.crear_lead(text, text, text, text, text, inet, text);

create or replace function public.crear_lead(
  p_nombre text, p_telefono text, p_correo text, p_servicio text, p_mensaje text,
  p_ip inet default null, p_user_agent text default null, p_origen jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_origen text;
  v_referente text;
  v_utm jsonb;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Nombre requerido' using errcode = '22023';
  end if;
  if length(p_nombre) > 120 or length(coalesce(p_telefono, '')) > 30 or length(coalesce(p_correo, '')) > 160
     or length(coalesce(p_servicio, '')) > 120 or length(coalesce(p_mensaje, '')) > 3000 then
    raise exception 'Algún dato es demasiado largo.' using errcode = '22001';
  end if;

  -- Tope global: aunque alguien llame la función directamente con la clave anónima y sin IP.
  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiados envíos en este momento. Intenta en una hora.' using errcode = '53400';
  end if;
  if p_ip is not null
     and (select count(*) from public.leads where ip = p_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados envíos desde esta dirección. Intenta en una hora.' using errcode = '53400';
  end if;

  v_owner := public.propietario_id();
  if v_owner is null then
    raise exception 'El formulario no está disponible ahora.' using errcode = '55000';
  end if;

  -- El origen nunca impide guardar el lead: lo que no cumple se descarta.
  if jsonb_typeof(p_origen) = 'object' then
    v_origen := p_origen ->> 'origen';
    if v_origen is not null and v_origen not in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo') then
      v_origen := 'otro';
    end if;
    v_referente := nullif(left(lower(p_origen ->> 'referente'), 100), '');
    if v_referente is not null and v_referente !~ '^[a-z0-9.-]+$' then
      v_referente := null;
    end if;
    if jsonb_typeof(p_origen -> 'utm') = 'object' then
      select nullif(jsonb_strip_nulls(jsonb_build_object(
               'source', nullif(left(p_origen -> 'utm' ->> 'source', 80), ''),
               'medium', nullif(left(p_origen -> 'utm' ->> 'medium', 80), ''),
               'campaign', nullif(left(p_origen -> 'utm' ->> 'campaign', 80), ''))), '{}'::jsonb)
      into v_utm;
    end if;
  end if;

  insert into public.leads (owner_id, nombre, telefono, correo, servicio, mensaje, ip, user_agent, origen, referente, utm)
  values (v_owner, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_correo), ''),
          nullif(trim(p_servicio), ''), nullif(trim(p_mensaje), ''), p_ip, left(p_user_agent, 300),
          v_origen, v_referente, v_utm)
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.crear_lead(text, text, text, text, text, inet, text, jsonb) from public;
grant execute on function public.crear_lead(text, text, text, text, text, inet, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Conteo de eventos de la landing
-- ---------------------------------------------------------------------
create table if not exists public.eventos_landing (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  evento text not null check (evento in ('whatsapp_click', 'correo_click', 'contacto_enviado')),
  origen text not null check (origen in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo')),
  total integer not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, dia, evento, origen)
);
create index if not exists eventos_landing_owner_idx on public.eventos_landing (owner_id, dia desc);

drop trigger if exists eventos_landing_sistema on public.eventos_landing;
create trigger eventos_landing_sistema before insert or update on public.eventos_landing
  for each row execute function public.columnas_sistema();

-- De solo lectura para el propietario: solo la escribe registrar_evento() (security definer).
alter table public.eventos_landing enable row level security;
revoke all on public.eventos_landing from anon, authenticated;
grant select on public.eventos_landing to authenticated;
drop policy if exists eventos_landing_select_propio on public.eventos_landing;
create policy eventos_landing_select_propio on public.eventos_landing
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- Suma uno al contador del día (hora de Lima). Tope por fila y día para que nadie infle los números
-- a mano con la clave anónima; lo que pasa del tope se ignora en silencio.
create or replace function public.registrar_evento(p_evento text, p_origen text default 'directo')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_origen text := coalesce(nullif(p_origen, ''), 'directo');
begin
  if p_evento is null or p_evento not in ('whatsapp_click', 'correo_click', 'contacto_enviado') then
    raise exception 'Evento desconocido' using errcode = '22023';
  end if;
  if v_origen not in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo') then
    v_origen := 'otro';
  end if;
  v_owner := public.propietario_id();
  if v_owner is null then
    return;
  end if;
  insert into public.eventos_landing as e (owner_id, dia, evento, origen, total)
  values (v_owner, (now() at time zone 'America/Lima')::date, p_evento, v_origen, 1)
  on conflict (owner_id, dia, evento, origen) do update
    set total = e.total + 1
    where e.total < 500;
end;
$$;
revoke all on function public.registrar_evento(text, text) from public;
grant execute on function public.registrar_evento(text, text) to anon, authenticated;
