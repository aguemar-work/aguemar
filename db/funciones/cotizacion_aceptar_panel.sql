-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_aceptar_panel(p_cot uuid, p_nombre text, p_dni text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not exists (select 1 from public.cotizaciones c where c.id = p_cot and c.owner_id = auth.uid()) then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  return public.cotizacion_aceptar_core(p_cot, p_nombre, nullif(trim(coalesce(p_dni, '')), ''), 'propietario');
end;
$$;
