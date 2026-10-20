-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json(z.id) from public.cotizaciones z
  where z.id = p_id and z.owner_id = auth.uid() and public.es_propietario();
$$;
