-- Vigente según migrations/20261014221151_cotizaciones-cobros.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_modulo_activo(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce((select p_clave = any(c.modulos) from public.clientes c where c.usuario_id = auth.uid() and c.activa limit 1), false);
$$;
