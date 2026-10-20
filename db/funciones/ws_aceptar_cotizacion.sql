-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_aceptar_cotizacion(p_id uuid, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.ws_modulo_activo('cotizaciones')
     or not exists (select 1 from public.cotizaciones z where z.id = p_id and z.cliente_id = public.ws_empresa_id() and z.estado <> 'borrador') then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  return public.cotizacion_aceptar_core(p_id, p_nombre, p_dni, 'empresa');
end;
$$;
