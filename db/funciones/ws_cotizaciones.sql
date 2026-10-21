-- Vigente según migrations/20261021223421_pendiente-unico.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_cotizaciones()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with
  emp as (select public.ws_empresa_id() as id where public.ws_modulo_activo('cotizaciones')),
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  deuda as (select v.* from emp, public.deudas_cotizacion(emp.id) v),
  cots as (
    select z.id, z.numero, z.fecha, z.fecha + z.validez_dias as vence, z.asunto, z.area, z.moneda, z.total, z.trabajo_id,
           case when z.estado = 'enviada' and z.fecha + z.validez_dias < (select d from hoy) then 'vencida' else z.estado::text end as estado,
           z.aceptada_en,
           v.vence_pago, v.pendiente, v.dias_atraso
    from public.cotizaciones z
    join emp on z.cliente_id = emp.id
    left join deuda v on v.cotizacion_id = z.id
    where z.estado <> 'borrador'
  ),
  cob as (
    select k.id, k.fecha, k.monto, k.moneda, k.medio, k.referencia, k.cotizacion_id,
           (select z.numero from public.cotizaciones z where z.id = k.cotizacion_id) as cotizacion_numero
    from public.cobros k, emp
    where k.cliente_id = emp.id
  )
  select jsonb_build_object(
    'cotizaciones', coalesce((select jsonb_agg(to_jsonb(c) order by c.fecha desc, c.numero desc) from cots c), '[]'::jsonb),
    'cobros', coalesce((select jsonb_agg(to_jsonb(k) order by k.fecha desc) from cob k), '[]'::jsonb),
    'total_aceptado', coalesce((select sum(total) from cots where estado = 'aceptada'), 0),
    'total_cobrado', coalesce((select sum(monto) from cob), 0),
    'total_pendiente', coalesce((select sum(pendiente) from deuda where moneda = 'PEN'), 0),
    'total_vencido', coalesce((select sum(pendiente) from deuda where dias_atraso > 0 and moneda = 'PEN'), 0),
    'proximo_pago', (
      select jsonb_build_object('vence_pago', d.vence_pago, 'pendiente', d.pendiente, 'moneda', d.moneda)
      from deuda d where d.pendiente > 0 order by d.vence_pago limit 1
    )
  )
  where exists (select 1 from emp);
$$;
