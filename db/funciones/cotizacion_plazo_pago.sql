-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_plazo_pago()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.plazo_pago_dias is null then
    new.plazo_pago_dias := coalesce(
      (select p.plazo_pago_dias_default from public.perfil_marca p where p.owner_id = new.owner_id), 15);
  end if;
  return new;
end;
$$;
