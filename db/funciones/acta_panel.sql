-- Vigente según migrations/20261016201140_equipo-documentos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.acta_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json(a.id) from public.actas_entrega a
  where a.id = p_id and ((a.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(a.cliente_id));
$$;
