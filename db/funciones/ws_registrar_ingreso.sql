-- Vigente según migrations/20261020210512_sprint2-medicion.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_registrar_ingreso()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_n int;
begin
  update public.clientes c
  set ultimo_ingreso = now()
  where c.usuario_id = auth.uid()
    and c.activa
    and (c.ultimo_ingreso is null
         or (c.ultimo_ingreso at time zone 'America/Lima')::date < (now() at time zone 'America/Lima')::date);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
