-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_item_importe()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.importe := greatest(round(new.cantidad * new.precio_unitario)::integer - new.descuento, 0);
  return new;
end;
$$;
