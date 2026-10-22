-- T-34 · PRO-008 · "Mi cuenta": la empresa elige si recibe avisos por correo.
--
-- clientes.avisos_correo ya existe (el propietario lo cambia desde la ficha de la empresa). La empresa
-- no tiene políticas sobre las tablas, así que lo lee y lo cambia por dos funciones ws_*:
--   ws_preferencias()                 → {"avisos_correo": bool} de su empresa (null sin workspace).
--   ws_preferencias_guardar(p_avisos) → cambia solo ese campo de su propia empresa.
-- Aditiva: el código publicado no las usa.

create or replace function public.ws_preferencias()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object('avisos_correo', c.avisos_correo)
  from public.clientes c
  where c.id = public.ws_empresa_id();
$$;
revoke all on function public.ws_preferencias() from public, anon;
grant execute on function public.ws_preferencias() to authenticated;

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
revoke all on function public.ws_preferencias_guardar(boolean) from public, anon;
grant execute on function public.ws_preferencias_guardar(boolean) to authenticated;
