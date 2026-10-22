-- Vigente según migrations/20261022230827_ws-preferencias.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_preferencias()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object('avisos_correo', c.avisos_correo)
  from public.clientes c
  where c.id = public.ws_empresa_id();
$$;
