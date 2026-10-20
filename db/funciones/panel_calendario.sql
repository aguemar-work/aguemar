-- Vigente según migrations/20261016201140_equipo-documentos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
