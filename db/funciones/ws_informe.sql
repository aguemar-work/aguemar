-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_informe(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.informe_json(i.id) from public.informes i
  where i.id = p_id and i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes');
$$;
