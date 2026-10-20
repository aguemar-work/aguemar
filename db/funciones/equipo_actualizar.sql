-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.equipo_actualizar(p_usuario uuid, p_activo boolean, p_empresas uuid[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario puede hacer esto.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.miembros m where m.user_id = p_usuario and m.rol = 'colaborador') then
    raise exception 'Ese usuario no es parte de tu equipo.' using errcode = 'P0002';
  end if;
  update public.miembros set activo = p_activo, updated_at = now() where user_id = p_usuario;
  delete from public.miembro_empresas me
   where me.user_id = p_usuario and not (me.cliente_id = any (coalesce(p_empresas, '{}')));
  insert into public.miembro_empresas (user_id, cliente_id)
  select p_usuario, c.id from public.clientes c where c.id = any (coalesce(p_empresas, '{}')) and c.owner_id = auth.uid()
  on conflict do nothing;
end;
$$;
