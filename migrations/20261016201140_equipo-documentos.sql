-- =====================================================================
-- Fase 14 (2/2) · El colaborador abre, arma y descarga sus documentos
--
-- - *_panel (ficha, informe, brief, acta): además del propietario, el
--   colaborador asignado a la empresa del documento.
-- - panel_calendario y panel_informe_periodo corren con los permisos de quien
--   llama: leen trabajos/clientes de la tabla (propietario) y de las vistas
--   *_equipo (colaborador). Para el propietario las vistas no devuelven nada.
-- - trabajos_equipo: monto_estimado con el tipo de la tabla (integer).
-- =====================================================================

drop view if exists public.trabajos_equipo;
create view public.trabajos_equipo as
select t.id, t.owner_id, t.area, t.cliente_id, t.titulo, t.descripcion, t.estado, t.prioridad,
       t.fecha_inicio, t.fecha_compromiso, t.fecha_entrega,
       null::integer as monto_estimado, null::public.moneda as moneda, null::text as notas,
       t.orden, t.created_at, t.updated_at, t.visible_empresa
from public.trabajos t
where public.cliente_asignado(t.cliente_id);
revoke all on public.trabajos_equipo from public, anon;
grant select on public.trabajos_equipo to authenticated;

-- Documentos del panel ----------------------------------------------------
create or replace function public.ficha_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.ficha_json(f.id) from public.fichas f
  where f.id = p_id and ((f.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(f.cliente_id));
$$;

create or replace function public.informe_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.informe_json(i.id) from public.informes i
  where i.id = p_id and ((i.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(i.cliente_id));
$$;

create or replace function public.brief_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.brief_json(b.id) from public.briefs b
  where b.id = p_id and ((b.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(b.cliente_id));
$$;

create or replace function public.acta_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json(a.id) from public.actas_entrega a
  where a.id = p_id and ((a.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(a.cliente_id));
$$;

-- Calendario --------------------------------------------------------------
create or replace function public.panel_calendario(p_desde date, p_hasta date)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  with
  empresas as (
    select id, nombre from public.clientes
    union all
    select id, nombre from public.clientes_equipo
  ),
  obras as (
    select id, titulo, fecha_compromiso, estado, cliente_id, visible_empresa from public.trabajos
    union all
    select id, titulo, fecha_compromiso, estado, cliente_id, visible_empresa from public.trabajos_equipo
  ),
  items as (
    select a.id, 'actividad'::text as origen, a.tipo::text as tipo, a.titulo, a.fecha,
           to_char(a.hora_inicio, 'HH24:MI') as hora_inicio, to_char(a.hora_fin, 'HH24:MI') as hora_fin,
           a.estado::text as estado, a.cliente_id, c.nombre as empresa, a.trabajo_id, a.visible_empresa, a.lugar
    from public.actividades a
    left join empresas c on c.id = a.cliente_id
    where a.fecha between p_desde and p_hasta
    union all
    select t.id, 'entrega', 'entrega', t.titulo, t.fecha_compromiso, null, null,
           case when t.estado in ('entregado', 'cerrado') then 'hecha' else 'planificada' end,
           t.cliente_id, c.nombre, t.id, t.visible_empresa, null
    from obras t
    left join empresas c on c.id = t.cliente_id
    where t.fecha_compromiso between p_desde and p_hasta and t.estado <> 'cancelado'
    union all
    select f.id, 'mantenimiento', 'mantenimiento',
           'Mantenimiento: ' || coalesce((select concat_ws(' ', e.marca, e.modelo) from public.equipos e where e.id = f.equipo_id), f.tipo_servicio),
           f.proximo_mantenimiento, null, null, 'planificada', f.cliente_id, c.nombre, null, false, null
    from public.fichas f
    join empresas c on c.id = f.cliente_id
    where f.proximo_mantenimiento between p_desde and p_hasta
  )
  select coalesce(jsonb_agg(to_jsonb(i) order by i.fecha, i.hora_inicio nulls first, i.titulo), '[]'::jsonb) from items i;
$$;

-- Armar un informe con lo del periodo ---------------------------------------
create or replace function public.panel_informe_periodo(p_cliente uuid, p_desde date, p_hasta date, p_trabajo uuid default null)
returns jsonb
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  with
  rango as (
    select (p_desde::timestamp at time zone 'America/Lima') as desde,
           ((p_hasta + 1)::timestamp at time zone 'America/Lima') as hasta
  ),
  trabajos as (
    select t.id, t.titulo, t.estado, t.fecha_inicio, t.fecha_entrega from public.trabajos t
    where t.cliente_id = p_cliente and (p_trabajo is null or t.id = p_trabajo) and t.estado <> 'cancelado'
    union all
    select t.id, t.titulo, t.estado, t.fecha_inicio, t.fecha_entrega from public.trabajos_equipo t
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
