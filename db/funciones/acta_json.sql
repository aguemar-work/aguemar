-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.acta_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json_vivo(p_id)
         || coalesce((select a.aceptada_documento from public.actas_entrega a where a.id = p_id), '{}'::jsonb);
$$;
