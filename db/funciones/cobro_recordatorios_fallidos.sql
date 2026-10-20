-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cobro_recordatorios_fallidos(p_clave text, p_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_n integer;
begin
  if not public.cron_autorizado(p_clave) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.recordatorios_cobro r
  where r.id = any(coalesce(p_ids, '{}'))
    and r.created_at > now() - interval '1 day';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
