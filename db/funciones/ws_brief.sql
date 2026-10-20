-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_brief(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.brief_json(b.id) from public.briefs b
  where b.id = p_id and b.cliente_id = public.ws_empresa_id() and b.publicado and public.ws_modulo_activo('documentos');
$$;
