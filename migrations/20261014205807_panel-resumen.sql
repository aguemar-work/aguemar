-- Inicio del panel en una sola llamada: lo que pide atención hoy.
-- security invoker: corre con la sesión del propietario, así que RLS filtra por owner_id.

create or replace function public.panel_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  activos as (
    select t.*,
           c.nombre as empresa,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha) as tareas_hechas,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id) as tareas_total,
           greatest(t.updated_at, coalesce((select max(x.updated_at) from public.trabajo_tareas x where x.trabajo_id = t.id), t.updated_at)) as ultima_actividad
    from public.trabajos t
    left join public.clientes c on c.id = t.cliente_id
    where t.estado in ('propuesta', 'en_curso', 'en_revision')
  )
  select jsonb_build_object(
    'hoy', (select d from hoy),

    'por_area', jsonb_build_object(
      'diseno', (select count(*) from activos where area = 'diseno'),
      'desarrollo', (select count(*) from activos where area = 'desarrollo'),
      'soporte', (select count(*) from activos where area = 'soporte')
    ),
    'por_estado', jsonb_build_object(
      'propuesta', (select count(*) from activos where estado = 'propuesta'),
      'en_curso', (select count(*) from activos where estado = 'en_curso'),
      'en_revision', (select count(*) from activos where estado = 'en_revision')
    ),

    'entregas_vencidas', (select count(*) from activos, hoy where fecha_compromiso < hoy.d),
    'entregas_semana', (select count(*) from activos, hoy where fecha_compromiso between hoy.d and hoy.d + 7),
    'entregas', coalesce((
      select jsonb_agg(e order by e.fecha_compromiso)
      from (
        select a.id, a.titulo, a.area, a.estado, a.prioridad, a.fecha_compromiso, a.empresa, a.tareas_hechas, a.tareas_total
        from activos a, hoy
        where a.fecha_compromiso is not null and a.fecha_compromiso <= hoy.d + 14
        order by a.fecha_compromiso
        limit 10
      ) e
    ), '[]'::jsonb),

    'tareas_vencidas', (
      select count(*)
      from public.trabajo_tareas x
      join activos a on a.id = x.trabajo_id, hoy
      where not x.hecha and x.fecha_limite < hoy.d
    ),

    'detenidos', coalesce((
      select jsonb_agg(d order by d.ultima_actividad)
      from (
        select a.id, a.titulo, a.area, a.empresa, a.ultima_actividad
        from activos a
        where a.estado = 'en_curso' and a.ultima_actividad < now() - interval '10 days'
        order by a.ultima_actividad
        limit 6
      ) d
    ), '[]'::jsonb),

    'comentarios_sin_leer', (select count(*) from public.comentarios where not es_propietario and not leido),
    'comentarios', coalesce((
      select jsonb_agg(k order by k.created_at desc)
      from (
        select m.id, m.entidad, m.entidad_id, m.texto, m.created_at, c.nombre as empresa,
               case when m.entidad = 'trabajo' then (select t.titulo from public.trabajos t where t.id = m.entidad_id) end as titulo
        from public.comentarios m
        join public.clientes c on c.id = m.cliente_id
        where not m.es_propietario and not m.leido
        order by m.created_at desc
        limit 5
      ) k
    ), '[]'::jsonb),

    'cotizaciones_sin_respuesta', (select count(*) from public.cotizaciones where estado = 'enviada'),
    'cotizaciones_borrador', (select count(*) from public.cotizaciones where estado = 'borrador'),
    'cotizaciones', coalesce((
      select jsonb_agg(q order by q.vence)
      from (
        select z.id, z.numero, z.asunto, z.total, z.moneda, z.fecha, z.fecha + z.validez_dias as vence, c.nombre as empresa
        from public.cotizaciones z
        join public.clientes c on c.id = z.cliente_id
        where z.estado = 'enviada'
        order by z.fecha + z.validez_dias
        limit 6
      ) q
    ), '[]'::jsonb),
    'aceptado_mes', coalesce((
      select sum(total) from public.cotizaciones, hoy
      where estado = 'aceptada' and date_trunc('month', aceptada_en at time zone 'America/Lima') = date_trunc('month', hoy.d::timestamp)
    ), 0),

    'mantenimientos', coalesce((
      select jsonb_agg(f order by f.proximo_mantenimiento)
      from (
        select fi.id, fi.numero, fi.proximo_mantenimiento, c.nombre as empresa, e.modelo, e.serie
        from public.fichas fi
        join public.clientes c on c.id = fi.cliente_id
        left join public.equipos e on e.id = fi.equipo_id, hoy
        where fi.proximo_mantenimiento between hoy.d and hoy.d + 30
        order by fi.proximo_mantenimiento
        limit 6
      ) f
    ), '[]'::jsonb),

    'leads_nuevos', (select count(*) from public.leads where estado = 'nuevo'),
    'empresas', (select count(*) from public.clientes),
    'empresas_con_acceso', (select count(*) from public.clientes where usuario_id is not null)
  );
$$;

revoke all on function public.panel_resumen() from public, anon;
grant execute on function public.panel_resumen() to authenticated;
