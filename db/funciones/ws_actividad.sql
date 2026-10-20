-- Vigente según migrations/20261015162658_calendario-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
