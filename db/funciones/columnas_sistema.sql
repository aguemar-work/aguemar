-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.columnas_sistema()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_at := now();
    else
      new.created_at := old.created_at;
      new.owner_id := old.owner_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
