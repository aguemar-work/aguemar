-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.dueno_estudio()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case when public.es_propietario() or public.es_colaborador() then public.propietario_id() end;
$$;
