-- Vigente según migrations/20261022230827_ws-preferencias.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_preferencias_guardar(p_avisos boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
begin
  if v_empresa is null then
    raise exception 'No tienes acceso a un workspace' using errcode = '42501';
  end if;
  if p_avisos is null then
    raise exception 'Indica si quieres recibir avisos' using errcode = '22023';
  end if;
  update public.clientes set avisos_correo = p_avisos where id = v_empresa;
end;
$$;
