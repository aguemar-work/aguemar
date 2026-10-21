-- Vigente según migrations/20261021224712_anulaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         - array['id', 'estado', 'enviada_en', 'aceptada_en', 'trabajo_id', 'aceptacion', 'cobrado',
                 'pendiente', 'vence_pago', 'atraso_dias', 'version', 'huella', 'anulada_en'];
$$;
