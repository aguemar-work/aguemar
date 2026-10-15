-- =====================================================================
-- Fase 8 · Calendario (actividades) y solicitudes
-- - actividades: agenda por empresa (o propia), visible o no para la empresa.
-- - solicitudes: la empresa pide trabajos; el propietario responde y las convierte.
-- - panel_calendario / ws_calendario: actividades + entregas de trabajos (+ mantenimientos en el panel).
-- - ws_comentar admite comentarios en actividades.
-- - panel_resumen y ws_inicio suman agenda y solicitudes (manteniendo sus campos anteriores).
-- =====================================================================

create type public.tipo_actividad as enum ('trabajo', 'reunion', 'publicacion', 'mantenimiento', 'entrega', 'otro');
create type public.estado_actividad as enum ('planificada', 'hecha', 'cancelada');
create type public.estado_solicitud as enum ('nueva', 'en_revision', 'aceptada', 'rechazada');

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  descripcion text,
  tipo public.tipo_actividad not null default 'otro',
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  lugar text, -- dirección o enlace de la reunión
  estado public.estado_actividad not null default 'planificada',
  visible_empresa boolean not null default true,
  notas text, -- internas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actividades_horas check (hora_fin is null or hora_inicio is null or hora_fin >= hora_inicio)
);
create index actividades_owner_fecha_idx on public.actividades (owner_id, fecha);
create index actividades_cliente_fecha_idx on public.actividades (cliente_id, fecha);
create index actividades_trabajo_idx on public.actividades (trabajo_id);
create trigger actividades_updated_at before update on public.actividades for each row execute function public.set_updated_at();

create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0 and length(titulo) <= 200),
  descripcion text check (descripcion is null or length(descripcion) <= 4000),
  area public.area,
  prioridad public.prioridad not null default 'media',
  fecha_deseada date,
  estado public.estado_solicitud not null default 'nueva',
  respuesta text, -- la ve la empresa
  trabajo_id uuid references public.trabajos(id) on delete set null,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index solicitudes_owner_idx on public.solicitudes (owner_id, estado, created_at desc);
create index solicitudes_cliente_idx on public.solicitudes (cliente_id, created_at desc);
create trigger solicitudes_updated_at before update on public.solicitudes for each row execute function public.set_updated_at();

-- ---------- RLS (propietario) ----------
alter table public.actividades enable row level security;
revoke all on public.actividades from anon;
grant select, insert, update, delete on public.actividades to authenticated;
create policy actividades_select_propio on public.actividades for select to authenticated using (owner_id = (select auth.uid()));
create policy actividades_insert_propio on public.actividades for insert to authenticated with check (owner_id = (select auth.uid()));
create policy actividades_update_propio on public.actividades for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy actividades_delete_propio on public.actividades for delete to authenticated using (owner_id = (select auth.uid()));

-- Las solicitudes las crea la empresa con ws_solicitar; el propietario solo lee, responde y borra.
alter table public.solicitudes enable row level security;
revoke all on public.solicitudes from anon;
grant select, update, delete on public.solicitudes to authenticated;
create policy solicitudes_select_propio on public.solicitudes for select to authenticated using (owner_id = (select auth.uid()));
create policy solicitudes_update_propio on public.solicitudes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy solicitudes_delete_propio on public.solicitudes for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------- Calendario del panel ----------
-- Actividades + entregas comprometidas de trabajos activos + mantenimientos sugeridos en fichas.
create or replace function public.panel_calendario(p_desde date, p_hasta date)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with items as (
    select a.id, 'actividad'::text as origen, a.tipo::text as tipo, a.titulo, a.fecha,
           to_char(a.hora_inicio, 'HH24:MI') as hora_inicio, to_char(a.hora_fin, 'HH24:MI') as hora_fin,
           a.estado::text as estado, a.cliente_id, c.nombre as empresa, a.trabajo_id, a.visible_empresa, a.lugar
    from public.actividades a
    left join public.clientes c on c.id = a.cliente_id
    where a.fecha between p_desde and p_hasta
    union all
    select t.id, 'entrega', 'entrega', t.titulo, t.fecha_compromiso, null, null,
           case when t.estado in ('entregado', 'cerrado') then 'hecha' else 'planificada' end,
           t.cliente_id, c.nombre, t.id, t.visible_empresa, null
    from public.trabajos t
    left join public.clientes c on c.id = t.cliente_id
    where t.fecha_compromiso between p_desde and p_hasta and t.estado <> 'cancelado'
    union all
    select f.id, 'mantenimiento', 'mantenimiento',
           'Mantenimiento: ' || coalesce((select concat_ws(' ', e.marca, e.modelo) from public.equipos e where e.id = f.equipo_id), f.tipo_servicio),
           f.proximo_mantenimiento, null, null, 'planificada', f.cliente_id, c.nombre, null, false, null
    from public.fichas f
    join public.clientes c on c.id = f.cliente_id
    where f.proximo_mantenimiento between p_desde and p_hasta
  )
  select coalesce(jsonb_agg(to_jsonb(i) order by i.fecha, i.hora_inicio nulls first, i.titulo), '[]'::jsonb) from items i;
$$;
revoke all on function public.panel_calendario(date, date) from public, anon;
grant execute on function public.panel_calendario(date, date) to authenticated;

-- ---------- Workspace: calendario ----------
create or replace function public.ws_calendario(p_desde date, p_hasta date)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with emp as (select public.ws_empresa_id() as id where public.ws_modulo_activo('calendario')),
  items as (
    select a.id, 'actividad'::text as origen, a.tipo::text as tipo, a.titulo, a.fecha,
           to_char(a.hora_inicio, 'HH24:MI') as hora_inicio, to_char(a.hora_fin, 'HH24:MI') as hora_fin,
           a.estado::text as estado, a.lugar, a.trabajo_id
    from public.actividades a, emp
    where a.cliente_id = emp.id and a.visible_empresa and a.fecha between p_desde and p_hasta
    union all
    select t.id, 'entrega', 'entrega', t.titulo, t.fecha_compromiso, null, null,
           case when t.estado in ('entregado', 'cerrado') then 'hecha' else 'planificada' end, null, t.id
    from public.trabajos t, emp
    where t.cliente_id = emp.id and t.visible_empresa and t.estado <> 'cancelado'
      and t.fecha_compromiso between p_desde and p_hasta
  )
  select coalesce(jsonb_agg(to_jsonb(i) order by i.fecha, i.hora_inicio nulls first, i.titulo), '[]'::jsonb)
  from items i
  where exists (select 1 from emp);
$$;
revoke all on function public.ws_calendario(date, date) from public, anon;
grant execute on function public.ws_calendario(date, date) to authenticated;

create or replace function public.ws_actividad(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id, 'titulo', a.titulo, 'descripcion', a.descripcion, 'tipo', a.tipo, 'fecha', a.fecha,
    'hora_inicio', to_char(a.hora_inicio, 'HH24:MI'), 'hora_fin', to_char(a.hora_fin, 'HH24:MI'),
    'lugar', a.lugar, 'estado', a.estado,
    'trabajo', (select jsonb_build_object('id', t.id, 'titulo', t.titulo) from public.trabajos t where t.id = a.trabajo_id and t.visible_empresa)
  )
  from public.actividades a
  where a.id = p_id and a.cliente_id = public.ws_empresa_id() and a.visible_empresa and public.ws_modulo_activo('calendario');
$$;
revoke all on function public.ws_actividad(uuid) from public, anon;
grant execute on function public.ws_actividad(uuid) to authenticated;

-- La empresa comenta trabajos y actividades suyas y visibles.
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

-- ---------- Workspace: solicitudes ----------
create or replace function public.ws_solicitudes()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'titulo', s.titulo, 'descripcion', s.descripcion, 'area', s.area, 'prioridad', s.prioridad,
           'fecha_deseada', s.fecha_deseada, 'estado', s.estado, 'respuesta', s.respuesta, 'created_at', s.created_at,
           'trabajo', (select jsonb_build_object('id', t.id, 'titulo', t.titulo) from public.trabajos t where t.id = s.trabajo_id and t.visible_empresa)
         ) order by s.created_at desc), '[]'::jsonb)
  from public.solicitudes s
  where s.cliente_id = public.ws_empresa_id() and public.ws_modulo_activo('solicitudes');
$$;
revoke all on function public.ws_solicitudes() from public, anon;
grant execute on function public.ws_solicitudes() to authenticated;

create or replace function public.ws_solicitar(p_titulo text, p_descripcion text, p_area public.area default null, p_prioridad public.prioridad default 'media', p_fecha_deseada date default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  if v_empresa is null or not public.ws_modulo_activo('solicitudes') then
    raise exception 'No tienes acceso a solicitudes' using errcode = '42501';
  end if;
  if p_titulo is null or length(trim(p_titulo)) < 3 then
    raise exception 'Escribe qué necesitas en el título' using errcode = '22023';
  end if;
  if length(p_titulo) > 200 or length(coalesce(p_descripcion, '')) > 4000 then
    raise exception 'El texto es demasiado largo' using errcode = '22023';
  end if;
  if p_fecha_deseada is not null and p_fecha_deseada < v_hoy then
    raise exception 'La fecha deseada no puede ser pasada' using errcode = '22023';
  end if;
  -- Límite simple contra abusos: 20 solicitudes por día y empresa.
  if (select count(*) from public.solicitudes s where s.cliente_id = v_empresa and s.created_at > now() - interval '1 day') >= 20 then
    raise exception 'Llegaste al límite de solicitudes por hoy. Escríbenos directamente.' using errcode = '22023';
  end if;

  select c.owner_id into v_owner from public.clientes c where c.id = v_empresa;
  insert into public.solicitudes (owner_id, cliente_id, titulo, descripcion, area, prioridad, fecha_deseada)
  values (v_owner, v_empresa, trim(p_titulo), nullif(trim(coalesce(p_descripcion, '')), ''), p_area, coalesce(p_prioridad, 'media'), p_fecha_deseada)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.ws_solicitar(text, text, public.area, public.prioridad, date) from public, anon;
grant execute on function public.ws_solicitar(text, text, public.area, public.prioridad, date) to authenticated;

-- ---------- ws_inicio: + próximas actividades y solicitudes abiertas ----------
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
                     'titulo', coalesce((select t.titulo from public.trabajos t where t.id = k.entidad_id), (select a.titulo from public.actividades a where a.id = k.entidad_id))) order by k.created_at desc), '[]'::jsonb)
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
    'solicitudes_abiertas', (select count(*) from public.solicitudes s where s.cliente_id = public.ws_empresa_id() and s.estado in ('nueva', 'en_revision'))
  );
$$;

-- ---------- Inicio del panel: + agenda de la semana y solicitudes nuevas ----------
create or replace function public.panel_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  activos as (
    select t.*,
           c.nombre as empresa,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha) as tareas_hechas,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id) as tareas_total,
           greatest(t.updated_at, coalesce((select max(x.updated_at) from public.trabajo_tareas x where x.trabajo_id = t.id), t.updated_at)) as ultima_actividad
    from public.trabajos t
    left join public.clientes c on c.id = t.cliente_id
    where t.estado in ('propuesta', 'en_curso', 'en_revision')
  ),
  -- Saldo por empresa y moneda: aceptado menos cobrado.
  deudas as (
    select c.id as cliente_id, c.nombre as empresa, x.moneda,
           sum(x.aceptado)::integer as aceptado, sum(x.cobrado)::integer as cobrado,
           (sum(x.aceptado) - sum(x.cobrado))::integer as saldo
    from (
      select z.cliente_id, z.moneda, z.total as aceptado, 0 as cobrado from public.cotizaciones z where z.estado = 'aceptada'
      union all
      select k.cliente_id, k.moneda, 0, k.monto from public.cobros k
    ) x
    join public.clientes c on c.id = x.cliente_id
    group by c.id, c.nombre, x.moneda
  )
  select jsonb_build_object(
    'hoy', (select d from hoy),

    'por_area', jsonb_build_object(
      'diseno', (select count(*) from activos where area = 'diseno'),
      'desarrollo', (select count(*) from activos where area = 'desarrollo'),
      'soporte', (select count(*) from activos where area = 'soporte')
    ),
    'por_estado', jsonb_build_object(
      'propuesta', (select count(*) from activos where estado = 'propuesta'),
      'en_curso', (select count(*) from activos where estado = 'en_curso'),
      'en_revision', (select count(*) from activos where estado = 'en_revision')
    ),

    'entregas_vencidas', (select count(*) from activos, hoy where fecha_compromiso < hoy.d),
    'entregas_semana', (select count(*) from activos, hoy where fecha_compromiso between hoy.d and hoy.d + 7),
    'entregas', coalesce((
      select jsonb_agg(e order by e.fecha_compromiso)
      from (
        select a.id, a.titulo, a.area, a.estado, a.prioridad, a.fecha_compromiso, a.empresa, a.tareas_hechas, a.tareas_total
        from activos a, hoy
        where a.fecha_compromiso is not null and a.fecha_compromiso <= hoy.d + 14
        order by a.fecha_compromiso
        limit 10
      ) e
    ), '[]'::jsonb),

    'tareas_vencidas', (
      select count(*)
      from public.trabajo_tareas x
      join activos a on a.id = x.trabajo_id, hoy
      where not x.hecha and x.fecha_limite < hoy.d
    ),

    'detenidos', coalesce((
      select jsonb_agg(d order by d.ultima_actividad)
      from (
        select a.id, a.titulo, a.area, a.empresa, a.ultima_actividad
        from activos a
        where a.estado = 'en_curso' and a.ultima_actividad < now() - interval '10 days'
        order by a.ultima_actividad
        limit 6
      ) d
    ), '[]'::jsonb),

    'comentarios_sin_leer', (select count(*) from public.comentarios where not es_propietario and not leido),
    'comentarios', coalesce((
      select jsonb_agg(k order by k.created_at desc)
      from (
        select m.id, m.entidad, m.entidad_id, m.texto, m.created_at, c.nombre as empresa,
               case when m.entidad = 'trabajo' then (select t.titulo from public.trabajos t where t.id = m.entidad_id) end as titulo
        from public.comentarios m
        join public.clientes c on c.id = m.cliente_id
        where not m.es_propietario and not m.leido
        order by m.created_at desc
        limit 5
      ) k
    ), '[]'::jsonb),

    'cotizaciones_sin_respuesta', (select count(*) from public.cotizaciones where estado = 'enviada'),
    'cotizaciones_borrador', (select count(*) from public.cotizaciones where estado = 'borrador'),
    'cotizaciones', coalesce((
      select jsonb_agg(q order by q.vence)
      from (
        select z.id, z.numero, z.asunto, z.total, z.moneda, z.fecha, z.fecha + z.validez_dias as vence, c.nombre as empresa
        from public.cotizaciones z
        join public.clientes c on c.id = z.cliente_id
        where z.estado = 'enviada'
        order by z.fecha + z.validez_dias
        limit 6
      ) q
    ), '[]'::jsonb),
    'aceptado_mes', coalesce((
      select sum(total) from public.cotizaciones, hoy
      where estado = 'aceptada' and date_trunc('month', aceptada_en at time zone 'America/Lima') = date_trunc('month', hoy.d::timestamp)
    ), 0),

    'mantenimientos', coalesce((
      select jsonb_agg(f order by f.proximo_mantenimiento)
      from (
        select fi.id, fi.numero, fi.proximo_mantenimiento, c.nombre as empresa, e.modelo, e.serie
        from public.fichas fi
        join public.clientes c on c.id = fi.cliente_id
        left join public.equipos e on e.id = fi.equipo_id, hoy
        where fi.proximo_mantenimiento between hoy.d and hoy.d + 30
        order by fi.proximo_mantenimiento
        limit 6
      ) f
    ), '[]'::jsonb),

    'por_cobrar', coalesce((select sum(d.saldo) from deudas d where d.saldo > 0 and d.moneda = 'PEN'), 0),
    'deudores', coalesce((
      select jsonb_agg(jsonb_build_object('cliente_id', d.cliente_id, 'empresa', d.empresa, 'moneda', d.moneda,
                                          'aceptado', d.aceptado, 'cobrado', d.cobrado, 'saldo', d.saldo) order by d.saldo desc)
      from (select * from deudas where saldo > 0 order by saldo desc limit 6) d
    ), '[]'::jsonb),

    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva'),
    'solicitudes', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'titulo', s.titulo, 'empresa', c.nombre, 'created_at', s.created_at) order by s.created_at desc)
      from (select * from public.solicitudes where estado = 'nueva' order by created_at desc limit 5) s
      join public.clientes c on c.id = s.cliente_id
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'tipo', x.tipo, 'fecha', x.fecha,
                                          'hora_inicio', to_char(x.hora_inicio, 'HH24:MI'), 'empresa', x.empresa) order by x.fecha, x.hora_inicio)
      from (
        select a.id, a.titulo, a.tipo, a.fecha, a.hora_inicio, c.nombre as empresa
        from public.actividades a
        left join public.clientes c on c.id = a.cliente_id, hoy
        where a.estado = 'planificada' and a.fecha between hoy.d and hoy.d + 7
        order by a.fecha, a.hora_inicio
        limit 8
      ) x
    ), '[]'::jsonb),

    'leads_nuevos', (select count(*) from public.leads where estado = 'nuevo'),
    'empresas', (select count(*) from public.clientes),
    'empresas_con_acceso', (select count(*) from public.clientes where usuario_id is not null)
  );
$$;

revoke all on function public.panel_resumen() from public, anon;
grant execute on function public.panel_resumen() to authenticated;
