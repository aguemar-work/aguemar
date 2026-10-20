-- Vigente según migrations/20261014152859_empresas-workspaces.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select c.id from public.clientes c where c.usuario_id = auth.uid() and c.activa limit 1;
$$;
