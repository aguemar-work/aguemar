-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.deudas_cotizacion(p_cliente uuid default null)
returns table (
  cotizacion_id uuid,
  owner_id uuid,
  cliente_id uuid,
  moneda public.moneda,
  total integer,
  pendiente integer,
  aceptada_el date,
  plazo_pago_dias integer,
  vence_pago date,
  dias_atraso integer,
  recordar_pago boolean
)
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  cots as (
    select z.id, z.owner_id, z.cliente_id, z.moneda, z.total, z.plazo_pago_dias, z.recordar_pago, z.aceptada_en,
           (z.aceptada_en at time zone 'America/Lima')::date as aceptada_el,
           (z.aceptada_en at time zone 'America/Lima')::date + z.plazo_pago_dias as vence_pago,
           coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id and k.moneda = z.moneda), 0) as ligado
    from public.cotizaciones z
    where z.estado = 'aceptada' and z.aceptada_en is not null
      and (p_cliente is null or z.cliente_id = p_cliente)
  ),
  -- Lo que queda para repartir: cobros sueltos (o ligados a algo que no es una cotización
  -- aceptada de esa moneda) más lo que sobra de los ligados.
  bolsa as (
    select x.cliente_id, x.moneda, sum(x.monto) as monto
    from (
      select k.cliente_id, k.moneda, k.monto
      from public.cobros k
      where (p_cliente is null or k.cliente_id = p_cliente)
        and not exists (select 1 from cots c where c.id = k.cotizacion_id and c.moneda = k.moneda)
      union all
      select c.cliente_id, c.moneda, c.ligado - c.total from cots c where c.ligado > c.total
    ) x
    group by x.cliente_id, x.moneda
  ),
  fifo as (
    select c.*,
           greatest(c.total - c.ligado, 0) as pend0,
           coalesce(sum(greatest(c.total - c.ligado, 0)) over (
             partition by c.cliente_id, c.moneda
             order by c.vence_pago, c.aceptada_en, c.id
             rows between unbounded preceding and 1 preceding), 0) as antes,
           coalesce((select b.monto from bolsa b where b.cliente_id = c.cliente_id and b.moneda = c.moneda), 0) as bolsa
    from cots c
  )
  select f.id, f.owner_id, f.cliente_id, f.moneda, f.total,
         (f.pend0 - least(f.pend0, greatest(f.bolsa - f.antes, 0)))::integer as pendiente,
         f.aceptada_el, f.plazo_pago_dias, f.vence_pago,
         case when f.pend0 - least(f.pend0, greatest(f.bolsa - f.antes, 0)) > 0
              then greatest((select d from hoy) - f.vence_pago, 0) else 0 end as dias_atraso,
         f.recordar_pago
  from fifo f;
$$;
