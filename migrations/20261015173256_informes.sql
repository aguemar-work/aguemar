-- =====================================================================
-- Fase 9 · Informes de avance (INF-AAAA-NNN)
-- - Tabla informes con RLS del propietario y numeración automática.
-- - informe_json: proyección segura (panel, workspace, portal y PDF; nunca notas internas).
-- - panel_informe_periodo: lo hecho en un periodo para armar el informe en un clic.
-- - Workspace: ws_informes, ws_informe, comentarios en informes; ws_inicio suma los últimos.
-- - Enlace público y portal también para informes publicados.
-- =====================================================================

create table public.informes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero text, -- INF-AAAA-NNN
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  area public.area not null default 'desarrollo',
  fecha date not null default (now() at time zone 'America/Lima')::date,
  titulo text not null check (length(trim(titulo)) > 0 and length(titulo) <= 200),
  periodo_inicio date not null,
  periodo_fin date not null,
  resumen text check (resumen is null or length(resumen) <= 2000),
  indicadores jsonb not null default '[]'::jsonb, -- [{ "valor": "12", "etiqueta": "Tareas cerradas", "nota": "..." }] (máx. 4)
  secciones jsonb not null default '[]'::jsonb,   -- [{ "titulo": "...", "texto": "..." }]
  notas text, -- internas, nunca salen
  publicado boolean not null default false,
  publicado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero),
  constraint informes_periodo check (periodo_fin >= periodo_inicio),
  constraint informes_indicadores check (jsonb_typeof(indicadores) = 'array' and jsonb_array_length(indicadores) <= 4),
  constraint informes_secciones check (jsonb_typeof(secciones) = 'array' and jsonb_array_length(secciones) <= 20)
);
create index informes_owner_idx on public.informes (owner_id, fecha desc);
create index informes_cliente_idx on public.informes (cliente_id, periodo_fin desc);
create index informes_trabajo_idx on public.informes (trabajo_id);
create trigger informes_updated_at before update on public.informes for each row execute function public.set_updated_at();

-- Numeración: el trigger común ahora conoce los informes.
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
    when 'informes' then 'INF'
  end;
  new.numero := public.siguiente_numero(v_tipo, extract(year from new.fecha)::integer, new.owner_id);
  return new;
end;
$$;
create trigger informes_numero before insert on public.informes for each row execute function public.asignar_numero();

-- ---------- RLS ----------
alter table public.informes enable row level security;
revoke all on public.informes from anon;
grant select, insert, update, delete on public.informes to authenticated;
create policy informes_select_propio on public.informes for select to authenticated using (owner_id = (select auth.uid()));
create policy informes_insert_propio on public.informes for insert to authenticated with check (owner_id = (select auth.uid()));
create policy informes_update_propio on public.informes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy informes_delete_propio on public.informes for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------- Proyección ----------
create or replace function public.informe_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', i.id, 'numero', i.numero, 'fecha', i.fecha, 'area', i.area, 'titulo', i.titulo,
    'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin, 'resumen', i.resumen,
    'indicadores', i.indicadores, 'secciones', i.secciones,
    'publicado', i.publicado, 'publicado_en', i.publicado_en,
    'trabajo', (select t.titulo from public.trabajos t where t.id = i.trabajo_id),
    'cliente', public.cliente_json(i.cliente_id),
    'marca', public.marca_json(i.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'informe' and p.documento_id = i.id and not p.revocado)
  )
  from public.informes i where i.id = p_id;
$$;
revoke all on function public.informe_json(uuid) from public, anon, authenticated;

create or replace function public.informe_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.informe_json(i.id) from public.informes i where i.id = p_id and i.owner_id = auth.uid();
$$;
revoke all on function public.informe_panel(uuid) from public, anon;
grant execute on function public.informe_panel(uuid) to authenticated;

-- ---------- Lo hecho en un periodo (para armar el informe) ----------
-- Las tareas no guardan cuándo se cerraron: se toma su última modificación dentro del periodo.
create or replace function public.panel_informe_periodo(p_cliente uuid, p_desde date, p_hasta date, p_trabajo uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  rango as (
    select (p_desde::timestamp at time zone 'America/Lima') as desde,
           ((p_hasta + 1)::timestamp at time zone 'America/Lima') as hasta
  ),
  trabajos as (
    select t.* from public.trabajos t
    where t.cliente_id = p_cliente and (p_trabajo is null or t.id = p_trabajo) and t.estado <> 'cancelado'
  ),
  tareas as (
    select x.trabajo_id, x.titulo, x.updated_at
    from public.trabajo_tareas x
    join trabajos t on t.id = x.trabajo_id, rango r
    where x.hecha and x.updated_at >= r.desde and x.updated_at < r.hasta
  ),
  actividades as (
    select a.* from public.actividades a
    where a.cliente_id = p_cliente and (p_trabajo is null or a.trabajo_id = p_trabajo)
  ),
  fichas as (
    select f.* from public.fichas f
    where f.cliente_id = p_cliente and f.fecha between p_desde and p_hasta and (p_trabajo is null or f.trabajo_id = p_trabajo)
  )
  select jsonb_build_object(
    'tareas_hechas', (select count(*) from tareas),
    'actividades_hechas', (select count(*) from actividades a where a.estado = 'hecha' and a.fecha between p_desde and p_hasta),
    'entregados', (select count(*) from trabajos t where t.fecha_entrega between p_desde and p_hasta),
    'fichas_total', (select count(*) from fichas),
    'trabajos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'titulo', t.titulo, 'estado', t.estado,
               'hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha),
               'total', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
               'tareas', coalesce((select jsonb_agg(k.titulo order by k.updated_at) from tareas k where k.trabajo_id = t.id), '[]'::jsonb)
             ) order by t.titulo)
      from trabajos t
      where exists (select 1 from tareas k where k.trabajo_id = t.id)
         or t.fecha_entrega between p_desde and p_hasta
         or (t.estado in ('en_curso', 'en_revision') and coalesce(t.fecha_inicio, p_desde) <= p_hasta)
    ), '[]'::jsonb),
    'actividades', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', a.fecha, 'titulo', a.titulo, 'tipo', a.tipo) order by a.fecha)
      from actividades a where a.estado = 'hecha' and a.fecha between p_desde and p_hasta
    ), '[]'::jsonb),
    'fichas', coalesce((
      select jsonb_agg(jsonb_build_object('numero', f.numero, 'titular', f.titular, 'fecha', f.fecha) order by f.fecha)
      from fichas f
    ), '[]'::jsonb),
    'proximas', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', a.fecha, 'titulo', a.titulo, 'tipo', a.tipo) order by a.fecha)
      from (
        select * from actividades a
        where a.estado = 'planificada' and a.fecha > p_hasta and a.fecha <= p_hasta + 45
        order by a.fecha limit 10
      ) a
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.panel_informe_periodo(uuid, date, date, uuid) from public, anon;
grant execute on function public.panel_informe_periodo(uuid, date, date, uuid) to authenticated;

-- ---------- Workspace ----------
create or replace function public.ws_informes()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'numero', i.numero, 'fecha', i.fecha, 'area', i.area, 'titulo', i.titulo,
           'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin, 'resumen', i.resumen,
           'publicado_en', i.publicado_en,
           'comentarios', (select count(*) from public.comentarios k where k.entidad = 'informe' and k.entidad_id = i.id)
         ) order by i.periodo_fin desc, i.numero desc), '[]'::jsonb)
  from public.informes i
  where i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes');
$$;
revoke all on function public.ws_informes() from public, anon;
grant execute on function public.ws_informes() to authenticated;

create or replace function public.ws_informe(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.informe_json(i.id) from public.informes i
  where i.id = p_id and i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes');
$$;
revoke all on function public.ws_informe(uuid) from public, anon;
grant execute on function public.ws_informe(uuid) to authenticated;

-- La empresa comenta trabajos, actividades e informes suyos y visibles.
create or replace function public.ws_comentar(p_entidad public.entidad_comentario, p_id uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
begin
  if v_empresa is null then
    raise exception 'No tienes acceso a un workspace' using errcode = '42501';
  end if;
  if p_texto is null or length(trim(p_texto)) = 0 then
    raise exception 'Escribe un comentario' using errcode = '22023';
  end if;
  if length(p_texto) > 4000 then
    raise exception 'El comentario es demasiado largo' using errcode = '22023';
  end if;

  if p_entidad = 'trabajo' then
    select t.owner_id into v_owner from public.trabajos t
    where t.id = p_id and t.cliente_id = v_empresa and t.visible_empresa;
  elsif p_entidad = 'actividad' then
    select a.owner_id into v_owner from public.actividades a
    where a.id = p_id and a.cliente_id = v_empresa and a.visible_empresa;
  elsif p_entidad = 'informe' then
    select i.owner_id into v_owner from public.informes i
    where i.id = p_id and i.cliente_id = v_empresa and i.publicado and public.ws_modulo_activo('informes');
  else
    v_owner := null;
  end if;
  if v_owner is null then
    raise exception 'No encontramos ese elemento' using errcode = 'P0002';
  end if;

  insert into public.comentarios (owner_id, cliente_id, entidad, entidad_id, autor_uid, es_propietario, texto, leido)
  values (v_owner, v_empresa, p_entidad, p_id, auth.uid(), false, trim(p_texto), false)
  returning id into v_id;
  return v_id;
end;
$$;

-- ws_inicio: + últimos informes publicados (y títulos de respuestas en informes).
create or replace function public.ws_inicio()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'activos', (select count(*) from public.trabajos t where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('propuesta','en_curso','en_revision')),
    'entregados', (select count(*) from public.trabajos t where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('entregado','cerrado')),
    'proximos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'area', t.area, 'estado', t.estado, 'fecha_compromiso', t.fecha_compromiso) order by t.fecha_compromiso), '[]'::jsonb)
      from (
        select * from public.trabajos t
        where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('propuesta','en_curso','en_revision') and t.fecha_compromiso is not null
        order by t.fecha_compromiso limit 5
      ) t
    ),
    'respuestas', (
      select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'entidad', k.entidad, 'entidad_id', k.entidad_id, 'texto', k.texto, 'created_at', k.created_at,
                     'titulo', coalesce((select t.titulo from public.trabajos t where t.id = k.entidad_id),
                                        (select a.titulo from public.actividades a where a.id = k.entidad_id),
                                        (select i.numero || ' · ' || i.titulo from public.informes i where i.id = k.entidad_id))) order by k.created_at desc), '[]'::jsonb)
      from (
        select * from public.comentarios k
        where k.cliente_id = public.ws_empresa_id() and k.es_propietario
        order by k.created_at desc limit 5
      ) k
    ),
    'actividades', (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'fecha', a.fecha, 'hora_inicio', to_char(a.hora_inicio, 'HH24:MI')) order by a.fecha, a.hora_inicio), '[]'::jsonb)
      from (
        select * from public.actividades a
        where a.cliente_id = public.ws_empresa_id() and a.visible_empresa and a.estado = 'planificada'
          and a.fecha >= (now() at time zone 'America/Lima')::date and public.ws_modulo_activo('calendario')
        order by a.fecha, a.hora_inicio limit 5
      ) a
    ),
    'solicitudes_abiertas', (select count(*) from public.solicitudes s where s.cliente_id = public.ws_empresa_id() and s.estado in ('nueva', 'en_revision')),
    'informes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'numero', i.numero, 'titulo', i.titulo, 'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin) order by i.periodo_fin desc, i.numero desc), '[]'::jsonb)
      from (
        select * from public.informes i
        where i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes')
        order by i.periodo_fin desc, i.numero desc limit 3
      ) i
    )
  );
$$;

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
    when 'informe' then exists (select 1 from public.informes where id = p_id and owner_id = auth.uid())
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
  elsif v_enlace.tipo::text = 'informe' then
    select public.informe_json(i.id) into v_doc from public.informes i
    where i.id = v_enlace.documento_id and i.owner_id = v_enlace.owner_id and i.publicado;
  end if;
  if v_doc is null then
    return null;
  end if;

  update public.enlaces_publicos set vistas = vistas + 1, ultima_vista = now() where id = v_enlace.id;
  return jsonb_build_object('tipo', v_enlace.tipo, 'documento', v_doc);
end;
$$;
