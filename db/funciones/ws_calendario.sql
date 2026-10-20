-- Vigente según migrations/20261015162658_calendario-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
