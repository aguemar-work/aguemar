-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
                     'titulo', coalesce((select t.titulo from public.trabajos t where t.id = k.entidad_id),
                                        (select a.titulo from public.actividades a where a.id = k.entidad_id),
                                        (select i.numero || ' · ' || i.titulo from public.informes i where i.id = k.entidad_id))) order by k.created_at desc), '[]'::jsonb)
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
    'solicitudes_abiertas', (select count(*) from public.solicitudes s where s.cliente_id = public.ws_empresa_id() and s.estado in ('nueva', 'en_revision')),
    'informes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'numero', i.numero, 'titulo', i.titulo, 'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin) order by i.periodo_fin desc, i.numero desc), '[]'::jsonb)
      from (
        select * from public.informes i
        where i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes')
        order by i.periodo_fin desc, i.numero desc limit 3
      ) i
    )
  );
$$;
