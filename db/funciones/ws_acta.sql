-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_acta(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json(a.id) from public.actas_entrega a
  where a.id = p_id and a.cliente_id = public.ws_empresa_id() and a.publicada and public.ws_modulo_activo('documentos');
$$;
