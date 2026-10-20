-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_items_fijos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if exists (select 1 from public.cotizaciones z
             where z.id in (old.cotizacion_id, new.cotizacion_id) and z.estado = 'aceptada') then
    raise exception 'Una cotización aceptada no se edita: duplícala para hacer otra versión.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
