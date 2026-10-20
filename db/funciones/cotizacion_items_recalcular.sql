-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_items_recalcular()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.cotizaciones set updated_at = now() where id = old.cotizacion_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.cotizacion_id is distinct from old.cotizacion_id) then
    update public.cotizaciones set updated_at = now() where id = new.cotizacion_id;
  end if;
  return null;
end;
$$;
