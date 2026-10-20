-- Vigente según migrations/20261016201140_equipo-documentos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.brief_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.brief_json(b.id) from public.briefs b
  where b.id = p_id and ((b.owner_id = auth.uid() and public.es_propietario()) or public.cliente_asignado(b.cliente_id));
$$;
