-- Vigente según migrations/20261021224131_cotizacion-version.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_congelar_enviada()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_doc jsonb := public.cotizacion_contenido(new.id);
begin
  update public.cotizaciones
  set enviada_documento = v_doc, enviada_huella = public.huella_documento(v_doc)
  where id = new.id;
  return null;
end;
$$;
