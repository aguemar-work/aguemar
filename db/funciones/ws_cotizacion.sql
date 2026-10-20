-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_cotizacion(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json(z.id)
  from public.cotizaciones z
  where z.id = p_id
    and z.cliente_id = public.ws_empresa_id()
    and z.estado <> 'borrador'
    and public.ws_modulo_activo('cotizaciones');
$$;
