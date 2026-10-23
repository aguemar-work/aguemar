-- Vigente según migrations/20261023151851_reunion-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_reuniones_pedidas()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'titulo', s.titulo, 'descripcion', s.descripcion,
           'fecha_deseada', s.fecha_deseada, 'hora_deseada', to_char(s.hora_deseada, 'HH24:MI'), 'modalidad', s.modalidad,
           'estado', s.estado, 'respuesta', s.respuesta, 'created_at', s.created_at,
           'actividad', (select jsonb_build_object('id', a.id, 'fecha', a.fecha, 'hora_inicio', to_char(a.hora_inicio, 'HH24:MI'),
                                                  'hora_fin', to_char(a.hora_fin, 'HH24:MI'), 'lugar', a.lugar)
                         from public.actividades a
                         where a.id = s.actividad_id and a.cliente_id = s.cliente_id and a.visible_empresa)
         ) order by s.created_at desc), '[]'::jsonb)
  from public.solicitudes s
  where s.cliente_id = public.ws_empresa_id()
    and s.tipo = 'reunion'
    and public.ws_modulo_activo('calendario')
    and (s.estado in ('nueva', 'en_revision') or s.updated_at > now() - interval '30 days');
$$;
