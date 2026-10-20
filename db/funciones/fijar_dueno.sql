-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.fijar_dueno()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') and public.es_colaborador() then
    new.owner_id := public.dueno_estudio();
  end if;
  return new;
end;
$$;
