-- T-19 · SEC-006 · Lo que escribió la empresa solo lo puede cambiar la empresa.
--
-- Los comentarios son el registro de lo que pidió o aprobó la empresa. Las políticas de UPDATE
-- (comentarios_update_propio y comentarios_colaborador_update) dejaban al propietario y al colaborador
-- reescribir el texto, el autor o la entidad de un comentario de la empresa. La app solo cambia
-- `leido` (marcar como leído desde la Bandeja).
--
-- Con este disparador, por la API (current_user = authenticated o anon) un comentario escrito por la
-- empresa (es_propietario = false) solo admite cambios en `leido` (y en updated_at, que lo fija
-- columnas_sistema). Lo escrito por el propietario sí se puede editar. Las funciones ws_* corren con
-- los privilegios de su dueño, así que no les afecta.

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

drop trigger if exists comentarios_proteger_ajeno on public.comentarios;
create trigger comentarios_proteger_ajeno before update on public.comentarios
  for each row execute function public.comentarios_proteger_ajeno();
