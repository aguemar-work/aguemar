-- Vigente según migrations/20261013171444_funciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.vencer_cotizaciones(p_owner uuid default auth.uid())
returns integer
language sql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with v as (
    update public.cotizaciones
    set estado = 'vencida'
    where owner_id = p_owner
      and estado = 'enviada'
      and fecha + validez_dias < (now() at time zone 'America/Lima')::date
    returning 1
  )
  select count(*)::integer from v;
$$;
