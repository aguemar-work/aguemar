-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select m.rol from public.miembros m where m.user_id = auth.uid() and m.activo limit 1;
$$;
