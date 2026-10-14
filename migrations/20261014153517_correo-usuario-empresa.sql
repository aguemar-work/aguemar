-- =====================================================================
-- agueMar Studio · ws_correo_usuario
-- El propietario consulta el correo del usuario de acceso de una de sus empresas
-- (auth.users no está expuesta a la API de datos).
-- =====================================================================

create or replace function public.ws_correo_usuario(p_usuario uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select u.email
  from auth.users u
  where u.id = p_usuario
    and exists (select 1 from public.clientes c where c.usuario_id = p_usuario and c.owner_id = auth.uid());
$$;
revoke all on function public.ws_correo_usuario(uuid) from public;
grant execute on function public.ws_correo_usuario(uuid) to authenticated;
