-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.usuario_vinculable(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.es_propietario()
     and not exists (select 1 from public.miembros m where m.user_id = p_uid);
$$;
