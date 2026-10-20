-- Vigente según migrations/20261015162658_calendario-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
