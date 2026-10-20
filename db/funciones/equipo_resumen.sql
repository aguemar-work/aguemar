-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.equipo_resumen()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with hoy as (select (now() at time zone 'America/Lima')::date as d),
  mias as (
    select me.cliente_id from public.miembro_empresas me
    where me.user_id = auth.uid() and public.es_colaborador()
  )
  select jsonb_build_object(
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'slug', c.slug) order by c.nombre)
      from public.clientes c where c.id in (select cliente_id from mias)
    ), '[]'::jsonb),
    'trabajos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'titulo', t.titulo, 'area', t.area, 'estado', t.estado, 'fecha_compromiso', t.fecha_compromiso,
               'empresa', c.nombre,
               'tareas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
               'hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha)
             ) order by t.fecha_compromiso nulls last, t.titulo)
      from public.trabajos t join public.clientes c on c.id = t.cliente_id
      where t.cliente_id in (select cliente_id from mias) and t.estado in ('propuesta', 'en_curso', 'en_revision')
    ), '[]'::jsonb),
    'tareas_vencidas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'fecha_limite', x.fecha_limite,
                                          'trabajo_id', t.id, 'trabajo', t.titulo, 'empresa', c.nombre)
                       order by x.fecha_limite)
      from public.trabajo_tareas x
      join public.trabajos t on t.id = x.trabajo_id
      join public.clientes c on c.id = t.cliente_id
      where t.cliente_id in (select cliente_id from mias) and not x.hecha and x.fecha_limite < (select d from hoy)
        and t.estado not in ('cerrado', 'cancelado', 'entregado')
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'fecha', a.fecha,
                                          'hora_inicio', a.hora_inicio, 'empresa', c.nombre)
                       order by a.fecha, a.hora_inicio nulls first)
      from public.actividades a join public.clientes c on c.id = a.cliente_id
      where a.cliente_id in (select cliente_id from mias)
        and a.fecha between (select d from hoy) and (select d from hoy) + 7 and a.estado <> 'cancelada'
    ), '[]'::jsonb),
    'comentarios', (
      select count(*) from public.comentarios k
      where k.cliente_id in (select cliente_id from mias) and not k.es_propietario and not k.leido and k.entidad <> 'cotizacion'
    )
  );
$$;
