-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.owner_inmutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;
