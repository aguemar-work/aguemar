-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_ficha(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.ficha_json(f.id)
  from public.fichas f
  where f.id = p_id and f.cliente_id = public.ws_empresa_id() and f.publicada
    and (public.ws_modulo_activo('documentos') or public.ws_modulo_activo('equipos'));
$$;
