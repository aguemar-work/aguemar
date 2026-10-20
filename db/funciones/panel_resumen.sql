-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
  ),
  -- Saldo por empresa y moneda: aceptado menos cobrado.
  deudas as (
    select c.id as cliente_id, c.nombre as empresa, x.moneda,
           sum(x.aceptado)::integer as aceptado, sum(x.cobrado)::integer as cobrado,
           (sum(x.aceptado) - sum(x.cobrado))::integer as saldo
    from (
      select z.cliente_id, z.moneda, z.total as aceptado, 0 as cobrado from public.cotizaciones z where z.estado = 'aceptada'
      union all
      select k.cliente_id, k.moneda, 0, k.monto from public.cobros k
    ) x
    join public.clientes c on c.id = x.cliente_id
    group by c.id, c.nombre, x.moneda
  ),
  -- Lo vencido por empresa y moneda, con el atraso más largo.
  vencidas as (
    select v.cliente_id, v.moneda, sum(v.pendiente)::integer as vencido, max(v.dias_atraso) as dias_atraso
    from public.deudas_cotizacion() v
    where v.pendiente > 0 and v.dias_atraso > 0
    group by v.cliente_id, v.moneda
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

    'por_cobrar', coalesce((select sum(d.saldo) from deudas d where d.saldo > 0 and d.moneda = 'PEN'), 0),
    'por_cobrar_vencido', coalesce((select sum(v.vencido) from vencidas v where v.moneda = 'PEN'), 0),
    'deudores', coalesce((
      select jsonb_agg(jsonb_build_object('cliente_id', d.cliente_id, 'empresa', d.empresa, 'moneda', d.moneda,
                                          'aceptado', d.aceptado, 'cobrado', d.cobrado, 'saldo', d.saldo,
                                          'vencido', coalesce(v.vencido, 0), 'dias_atraso', coalesce(v.dias_atraso, 0))
                       order by coalesce(v.dias_atraso, 0) desc, d.saldo desc)
      from (select * from deudas where saldo > 0 order by saldo desc limit 6) d
      left join vencidas v on v.cliente_id = d.cliente_id and v.moneda = d.moneda
    ), '[]'::jsonb),

    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva'),
    'solicitudes', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'titulo', s.titulo, 'empresa', c.nombre, 'created_at', s.created_at) order by s.created_at desc)
      from (select * from public.solicitudes where estado = 'nueva' order by created_at desc limit 5) s
      join public.clientes c on c.id = s.cliente_id
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'tipo', x.tipo, 'fecha', x.fecha,
                                          'hora_inicio', to_char(x.hora_inicio, 'HH24:MI'), 'empresa', x.empresa) order by x.fecha, x.hora_inicio)
      from (
        select a.id, a.titulo, a.tipo, a.fecha, a.hora_inicio, c.nombre as empresa
        from public.actividades a
        left join public.clientes c on c.id = a.cliente_id, hoy
        where a.estado = 'planificada' and a.fecha between hoy.d and hoy.d + 7
        order by a.fecha, a.hora_inicio
        limit 8
      ) x
    ), '[]'::jsonb),

    'leads_nuevos', (select count(*) from public.leads where estado = 'nuevo'),
    'empresas', (select count(*) from public.clientes),
    'empresas_con_acceso', (select count(*) from public.clientes where usuario_id is not null)
  );
$$;
