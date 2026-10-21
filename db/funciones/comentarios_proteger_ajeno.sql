-- Vigente según migrations/20261021161250_comentarios-autor.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.comentarios_proteger_ajeno()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') and old.es_propietario = false
     and (to_jsonb(new) - 'leido' - 'updated_at') is distinct from (to_jsonb(old) - 'leido' - 'updated_at') then
    raise exception 'Solo la empresa puede cambiar lo que escribió.' using errcode = '42501';
  end if;
  return new;
end;
$$;
