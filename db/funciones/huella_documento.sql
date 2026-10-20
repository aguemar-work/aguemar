-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.huella_documento(p_doc jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select encode(sha256(convert_to(p_doc::text, 'UTF8')), 'hex');
$$;
