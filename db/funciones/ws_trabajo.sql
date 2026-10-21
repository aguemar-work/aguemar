-- Vigente según migrations/20261021161042_ws-modulos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_trabajo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
    'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
    'etapas', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'hecha', e.hecha, 'orden', e.orden) order by e.orden, e.created_at), '[]'::jsonb)
               from public.trabajo_etapas e where e.trabajo_id = t.id),
    'tareas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'etapa_id', x.etapa_id, 'titulo', x.titulo, 'hecha', x.hecha, 'fecha_limite', x.fecha_limite, 'orden', x.orden) order by x.orden, x.created_at), '[]'::jsonb)
               from public.trabajo_tareas x where x.trabajo_id = t.id),
    'entregables', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nombre', d.nombre, 'tipo', d.tipo, 'url', d.url, 'nota', d.nota) order by d.orden, d.created_at), '[]'::jsonb)
                    from public.trabajo_entregables d where d.trabajo_id = t.id)
  )
  from public.trabajos t
  where t.id = p_id and t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado'
    and public.ws_modulo_activo('proyectos');
$$;
