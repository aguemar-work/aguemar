-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cron_autorizado(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(length(p_clave) >= 32, false) and exists (
    select 1 from public.ajustes_sistema a
    where a.clave = 'cron_hash' and a.valor = encode(public.digest(p_clave, 'sha256'), 'hex')
  );
$$;
