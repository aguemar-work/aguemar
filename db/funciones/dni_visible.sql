-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.dni_visible(p_dni text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case
    when p_dni is null or p_dni = '' then null
    when public.es_propietario() then p_dni
    else '****' || right(p_dni, 4)
  end;
$$;
