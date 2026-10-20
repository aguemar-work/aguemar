-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.clientes_proteger_usuario()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.usuario_id is not null
     and new.usuario_id is distinct from (case when tg_op = 'UPDATE' then old.usuario_id end)
     and not public.usuario_vinculable(new.usuario_id) then
    raise exception 'No puedes vincular ese usuario a una empresa.' using errcode = '42501';
  end if;
  return new;
end;
$$;
