-- Vigente según migrations/20261016201140_equipo-documentos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ficha_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.ficha_json(f.id) from public.fichas f
  where f.id = p_id and ((f.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(f.cliente_id));
$$;
