-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ficha_asignada(p_ficha uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.fichas f where f.id = p_ficha and public.cliente_asignado(f.cliente_id));
$$;
