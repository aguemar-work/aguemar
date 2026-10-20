-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
    and public.es_propietario()
    and not exists (select 1 from public.miembros m where m.user_id = p_usuario)
    and exists (select 1 from public.clientes c where c.usuario_id = p_usuario and c.owner_id = auth.uid());
$$;
