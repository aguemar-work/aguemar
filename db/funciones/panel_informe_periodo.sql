-- Vigente según migrations/20261016201140_equipo-documentos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
