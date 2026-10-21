-- Vigente según migrations/20261021161042_ws-modulos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_trabajos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(fila order by
      case t.estado when 'en_curso' then 1 when 'en_revision' then 2 when 'propuesta' then 3 when 'entregado' then 4 else 5 end,
      t.fecha_compromiso nulls last, t.created_at desc), '[]'::jsonb)
  from public.trabajos t
  cross join lateral (
    select jsonb_build_object(
      'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
      'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
      'tareas_hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha),
      'tareas_total', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
      'comentarios', (select count(*) from public.comentarios k where k.entidad = 'trabajo' and k.entidad_id = t.id)
    ) as fila
  ) f
  where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado'
    and public.ws_modulo_activo('proyectos');
$$;
