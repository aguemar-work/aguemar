-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_totales()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_suma integer;
begin
  select coalesce(sum(i.importe), 0)::integer into v_suma
  from public.cotizacion_items i
  where i.cotizacion_id = new.id;

  if new.igv_modo = 'sumar' then
    new.subtotal := v_suma;
    new.igv := round(v_suma::numeric * new.igv_pct / 10000)::integer;
    new.total := new.subtotal + new.igv;
  else
    new.total := v_suma;
    new.subtotal := round(v_suma::numeric * 10000 / (10000 + new.igv_pct))::integer;
    new.igv := new.total - new.subtotal;
  end if;
  return new;
end;
$$;
