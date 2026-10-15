-- =====================================================================
-- Fase 7b · Briefs (BR-) y actas de entrega (AE-)
-- - Tablas con RLS del propietario y numeración automática.
-- - brief_json / acta_json: proyección completa y segura (panel, workspace, portal, PDF).
-- - Aceptación del acta (panel, workspace, portal): el trabajo pasa a "entregado".
-- - ws_documentos ahora lista fichas, briefs y actas publicados; el portal también los muestra.
-- =====================================================================

-- ---------- Tablas ----------
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero text, -- BR-AAAA-NNN
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  area public.area not null default 'diseno',
  fecha date not null default (now() at time zone 'America/Lima')::date,
  titulo text not null check (length(trim(titulo)) > 0),
  objetivo text,
  contexto text,
  publico text,
  alcance text,        -- una línea por punto
  fuera_alcance text,  -- una línea por punto
  entregables text,    -- una línea por punto
  referencias text,    -- una línea por referencia (texto o enlace)
  fecha_entrega date,
  notas text,          -- internas, nunca salen
  publicado boolean not null default false,
  publicado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero)
);
create index briefs_owner_idx on public.briefs (owner_id, fecha desc);
create index briefs_cliente_idx on public.briefs (cliente_id);
create index briefs_trabajo_idx on public.briefs (trabajo_id);

create table public.actas_entrega (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero text, -- AE-AAAA-NNN
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  area public.area not null default 'desarrollo',
  fecha date not null default (now() at time zone 'America/Lima')::date,
  titulo text not null check (length(trim(titulo)) > 0),
  resumen text,
  entregables jsonb not null default '[]'::jsonb, -- [{ "nombre": "...", "detalle": "...", "url": "..." }]
  observaciones text,
  notas text, -- internas
  publicada boolean not null default false,
  publicada_en timestamptz,
  aceptada_en timestamptz,
  aceptada_nombre text,
  aceptada_dni text check (aceptada_dni is null or aceptada_dni ~ '^\d{8}$'),
  aceptada_por text check (aceptada_por is null or aceptada_por in ('empresa', 'portal', 'propietario')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero),
  constraint actas_entregables_array check (jsonb_typeof(entregables) = 'array')
);
create index actas_owner_idx on public.actas_entrega (owner_id, fecha desc);
create index actas_cliente_idx on public.actas_entrega (cliente_id);
create index actas_trabajo_idx on public.actas_entrega (trabajo_id);

create trigger briefs_updated_at before update on public.briefs for each row execute function public.set_updated_at();
create trigger actas_entrega_updated_at before update on public.actas_entrega for each row execute function public.set_updated_at();

-- Numeración: el trigger común ahora conoce briefs y actas.
create or replace function public.asignar_numero()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_tipo text;
begin
  if new.numero is not null and new.numero <> '' then
    return new;
  end if;
  v_tipo := case tg_table_name
    when 'cotizaciones' then 'COT'
    when 'fichas' then 'FT'
    when 'briefs' then 'BR'
    when 'actas_entrega' then 'AE'
  end;
  new.numero := public.siguiente_numero(v_tipo, extract(year from new.fecha)::integer, new.owner_id);
  return new;
end;
$$;
create trigger briefs_numero before insert on public.briefs for each row execute function public.asignar_numero();
create trigger actas_entrega_numero before insert on public.actas_entrega for each row execute function public.asignar_numero();

-- ---------- RLS ----------
alter table public.briefs enable row level security;
revoke all on public.briefs from anon;
grant select, insert, update, delete on public.briefs to authenticated;
create policy briefs_select_propio on public.briefs for select to authenticated using (owner_id = (select auth.uid()));
create policy briefs_insert_propio on public.briefs for insert to authenticated with check (owner_id = (select auth.uid()));
create policy briefs_update_propio on public.briefs for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy briefs_delete_propio on public.briefs for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.actas_entrega enable row level security;
revoke all on public.actas_entrega from anon;
grant select, insert, update, delete on public.actas_entrega to authenticated;
create policy actas_select_propio on public.actas_entrega for select to authenticated using (owner_id = (select auth.uid()));
create policy actas_insert_propio on public.actas_entrega for insert to authenticated with check (owner_id = (select auth.uid()));
create policy actas_update_propio on public.actas_entrega for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy actas_delete_propio on public.actas_entrega for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------- Proyecciones ----------
create or replace function public.cliente_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
  from public.clientes c where c.id = p_id;
$$;
revoke all on function public.cliente_json(uuid) from public, anon, authenticated;

create or replace function public.brief_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', b.id, 'numero', b.numero, 'fecha', b.fecha, 'area', b.area, 'titulo', b.titulo,
    'objetivo', b.objetivo, 'contexto', b.contexto, 'publico', b.publico, 'alcance', b.alcance,
    'fuera_alcance', b.fuera_alcance, 'entregables', b.entregables, 'referencias', b.referencias,
    'fecha_entrega', b.fecha_entrega, 'publicado', b.publicado, 'publicado_en', b.publicado_en,
    'trabajo', (select t.titulo from public.trabajos t where t.id = b.trabajo_id),
    'cliente', public.cliente_json(b.cliente_id),
    'marca', public.marca_json(b.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'brief' and p.documento_id = b.id and not p.revocado)
  )
  from public.briefs b where b.id = p_id;
$$;
revoke all on function public.brief_json(uuid) from public, anon, authenticated;

create or replace function public.acta_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id, 'numero', a.numero, 'fecha', a.fecha, 'area', a.area, 'titulo', a.titulo, 'resumen', a.resumen,
    'entregables', a.entregables, 'observaciones', a.observaciones,
    'publicada', a.publicada, 'publicada_en', a.publicada_en,
    'aceptacion', case when a.aceptada_en is null then null
                       else jsonb_build_object('nombre', a.aceptada_nombre, 'dni', a.aceptada_dni, 'aceptado_en', a.aceptada_en) end,
    'trabajo', (select t.titulo from public.trabajos t where t.id = a.trabajo_id),
    'cliente', public.cliente_json(a.cliente_id),
    'marca', public.marca_json(a.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'acta' and p.documento_id = a.id and not p.revocado)
  )
  from public.actas_entrega a where a.id = p_id;
$$;
revoke all on function public.acta_json(uuid) from public, anon, authenticated;

create or replace function public.brief_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.brief_json(b.id) from public.briefs b where b.id = p_id and b.owner_id = auth.uid();
$$;
revoke all on function public.brief_panel(uuid) from public, anon;
grant execute on function public.brief_panel(uuid) to authenticated;

create or replace function public.acta_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json(a.id) from public.actas_entrega a where a.id = p_id and a.owner_id = auth.uid();
$$;
revoke all on function public.acta_panel(uuid) from public, anon;
grant execute on function public.acta_panel(uuid) to authenticated;

-- ---------- Aceptación del acta ----------
create or replace function public.acta_aceptar_core(p_id uuid, p_nombre text, p_dni text, p_por text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_acta public.actas_entrega%rowtype;
begin
  select * into v_acta from public.actas_entrega where id = p_id for update;
  if not found then
    raise exception 'Acta no encontrada' using errcode = 'P0002';
  end if;
  if v_acta.aceptada_en is not null then
    return jsonb_build_object('ok', true, 'ya_aceptada', true);
  end if;
  if p_por <> 'propietario' and not v_acta.publicada then
    raise exception 'Esta acta todavía no está disponible' using errcode = '22023';
  end if;
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Escribe el nombre de quien recibe' using errcode = '22023';
  end if;
  if p_por <> 'propietario' and p_dni is null then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;
  if p_dni is not null and p_dni !~ '^\d{8}$' then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;

  update public.actas_entrega
  set aceptada_en = now(), aceptada_nombre = trim(p_nombre), aceptada_dni = p_dni, aceptada_por = p_por
  where id = p_id;

  -- La entrega conforme cierra el ciclo del trabajo.
  update public.trabajos
  set estado = 'entregado', fecha_entrega = coalesce(fecha_entrega, (now() at time zone 'America/Lima')::date)
  where id = v_acta.trabajo_id and estado in ('propuesta', 'en_curso', 'en_revision');

  return jsonb_build_object('ok', true, 'ya_aceptada', false, 'numero', v_acta.numero);
end;
$$;
revoke all on function public.acta_aceptar_core(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.acta_aceptar_panel(p_id uuid, p_nombre text, p_dni text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not exists (select 1 from public.actas_entrega a where a.id = p_id and a.owner_id = auth.uid()) then
    raise exception 'Acta no encontrada' using errcode = 'P0002';
  end if;
  return public.acta_aceptar_core(p_id, p_nombre, nullif(trim(coalesce(p_dni, '')), ''), 'propietario');
end;
$$;
revoke all on function public.acta_aceptar_panel(uuid, text, text) from public, anon;
grant execute on function public.acta_aceptar_panel(uuid, text, text) to authenticated;

create or replace function public.ws_aceptar_acta(p_id uuid, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.ws_modulo_activo('documentos')
     or not exists (select 1 from public.actas_entrega a where a.id = p_id and a.cliente_id = public.ws_empresa_id() and a.publicada) then
    raise exception 'Acta no encontrada' using errcode = 'P0002';
  end if;
  return public.acta_aceptar_core(p_id, p_nombre, p_dni, 'empresa');
end;
$$;
revoke all on function public.ws_aceptar_acta(uuid, text, text) from public, anon;
grant execute on function public.ws_aceptar_acta(uuid, text, text) to authenticated;

create or replace function public.aceptar_acta(p_token text, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
begin
  select * into v_enlace from public.enlaces_publicos where token = p_token and revocado = false and tipo = 'acta';
  if not found then
    raise exception 'Enlace no válido' using errcode = 'P0002';
  end if;
  return public.acta_aceptar_core(v_enlace.documento_id, p_nombre, p_dni, 'portal');
end;
$$;
revoke all on function public.aceptar_acta(text, text, text) from public;
grant execute on function public.aceptar_acta(text, text, text) to anon, authenticated;

-- ---------- Enlaces y portal ----------
create or replace function public.obtener_enlace(p_tipo public.tipo_documento, p_id uuid, p_renovar boolean default false)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token text;
  v_existe boolean;
begin
  v_existe := case p_tipo::text
    when 'cotizacion' then exists (select 1 from public.cotizaciones where id = p_id and owner_id = auth.uid())
    when 'ficha' then exists (select 1 from public.fichas where id = p_id and owner_id = auth.uid())
    when 'brief' then exists (select 1 from public.briefs where id = p_id and owner_id = auth.uid())
    when 'acta' then exists (select 1 from public.actas_entrega where id = p_id and owner_id = auth.uid())
    else false
  end;
  if not v_existe then
    raise exception 'Documento no encontrado' using errcode = 'P0002';
  end if;

  insert into public.enlaces_publicos as e (owner_id, tipo, documento_id)
  values (auth.uid(), p_tipo, p_id)
  on conflict (tipo, documento_id) do update
    set revocado = false,
        token = case when p_renovar then public.generar_token() else e.token end
  returning e.token into v_token;
  return v_token;
end;
$$;

create or replace function public.portal_documento(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
  v_doc jsonb;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;
  select * into v_enlace from public.enlaces_publicos where token = p_token and revocado = false;
  if not found then
    return null;
  end if;

  if v_enlace.tipo::text = 'ficha' then
    select public.ficha_json(f.id) into v_doc from public.fichas f
    where f.id = v_enlace.documento_id and f.owner_id = v_enlace.owner_id and f.publicada;
  elsif v_enlace.tipo::text = 'cotizacion' then
    select public.cotizacion_json(z.id) into v_doc from public.cotizaciones z
    where z.id = v_enlace.documento_id and z.owner_id = v_enlace.owner_id and z.estado <> 'borrador';
  elsif v_enlace.tipo::text = 'brief' then
    select public.brief_json(b.id) into v_doc from public.briefs b
    where b.id = v_enlace.documento_id and b.owner_id = v_enlace.owner_id and b.publicado;
  elsif v_enlace.tipo::text = 'acta' then
    select public.acta_json(a.id) into v_doc from public.actas_entrega a
    where a.id = v_enlace.documento_id and a.owner_id = v_enlace.owner_id and a.publicada;
  end if;
  if v_doc is null then
    return null;
  end if;

  update public.enlaces_publicos set vistas = vistas + 1, ultima_vista = now() where id = v_enlace.id;
  return jsonb_build_object('tipo', v_enlace.tipo, 'documento', v_doc);
end;
$$;

-- ---------- Workspace ----------
create or replace function public.ws_documentos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with emp as (select public.ws_empresa_id() as id where public.ws_modulo_activo('documentos')),
  docs as (
    select f.id, 'ficha'::text as tipo, f.numero, f.fecha, f.titular as titulo, 'soporte'::text as area,
           f.estado_final::text as estado,
           (select concat_ws(' ', e.marca, e.modelo) || ' · ' || e.serie from public.equipos e where e.id = f.equipo_id) as detalle
    from public.fichas f, emp where f.cliente_id = emp.id and f.publicada
    union all
    select b.id, 'brief', b.numero, b.fecha, b.titulo, b.area::text, null, (select t.titulo from public.trabajos t where t.id = b.trabajo_id)
    from public.briefs b, emp where b.cliente_id = emp.id and b.publicado
    union all
    select a.id, 'acta', a.numero, a.fecha, a.titulo, a.area::text,
           case when a.aceptada_en is null then 'por_aceptar' else 'aceptada' end,
           (select t.titulo from public.trabajos t where t.id = a.trabajo_id)
    from public.actas_entrega a, emp where a.cliente_id = emp.id and a.publicada
  )
  select coalesce(jsonb_agg(to_jsonb(d) order by d.fecha desc, d.numero desc), '[]'::jsonb) from docs d;
$$;

create or replace function public.ws_brief(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.brief_json(b.id) from public.briefs b
  where b.id = p_id and b.cliente_id = public.ws_empresa_id() and b.publicado and public.ws_modulo_activo('documentos');
$$;
revoke all on function public.ws_brief(uuid) from public, anon;
grant execute on function public.ws_brief(uuid) to authenticated;

create or replace function public.ws_acta(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json(a.id) from public.actas_entrega a
  where a.id = p_id and a.cliente_id = public.ws_empresa_id() and a.publicada and public.ws_modulo_activo('documentos');
$$;
revoke all on function public.ws_acta(uuid) from public, anon;
grant execute on function public.ws_acta(uuid) to authenticated;
