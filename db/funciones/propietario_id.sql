-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.propietario_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select m.user_id from public.miembros m where m.rol = 'propietario' and m.activo limit 1;
$$;
