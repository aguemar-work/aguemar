-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_comentar(p_entidad public.entidad_comentario, p_id uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
begin
  if v_empresa is null then
    raise exception 'No tienes acceso a un workspace' using errcode = '42501';
  end if;
  if p_texto is null or length(trim(p_texto)) = 0 then
    raise exception 'Escribe un comentario' using errcode = '22023';
  end if;
  if length(p_texto) > 4000 then
    raise exception 'El comentario es demasiado largo' using errcode = '22023';
  end if;

  if p_entidad = 'trabajo' then
    select t.owner_id into v_owner from public.trabajos t
    where t.id = p_id and t.cliente_id = v_empresa and t.visible_empresa;
  elsif p_entidad = 'actividad' then
    select a.owner_id into v_owner from public.actividades a
    where a.id = p_id and a.cliente_id = v_empresa and a.visible_empresa;
  elsif p_entidad = 'informe' then
    select i.owner_id into v_owner from public.informes i
    where i.id = p_id and i.cliente_id = v_empresa and i.publicado and public.ws_modulo_activo('informes');
  else
    v_owner := null;
  end if;
  if v_owner is null then
    raise exception 'No encontramos ese elemento' using errcode = 'P0002';
  end if;

  insert into public.comentarios (owner_id, cliente_id, entidad, entidad_id, autor_uid, es_propietario, texto, leido)
  values (v_owner, v_empresa, p_entidad, p_id, auth.uid(), false, trim(p_texto), false)
  returning id into v_id;
  return v_id;
end;
$$;
