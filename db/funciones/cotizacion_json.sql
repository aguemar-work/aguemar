-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         || coalesce((select a.documento from public.aceptaciones a
                      where a.cotizacion_id = p_id and a.documento is not null
                      order by a.aceptado_en desc limit 1), '{}'::jsonb);
$$;
