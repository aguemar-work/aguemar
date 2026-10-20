-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.trabajo_asignado(p_trabajo uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.trabajos t where t.id = p_trabajo and public.cliente_asignado(t.cliente_id));
$$;
