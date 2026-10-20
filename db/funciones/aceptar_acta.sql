-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.aceptar_acta(p_token text, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
begin
  select * into v_enlace from public.enlaces_publicos where token = p_token and revocado = false and tipo = 'acta';
  if not found then
    raise exception 'Enlace no válido' using errcode = 'P0002';
  end if;
  return public.acta_aceptar_core(v_enlace.documento_id, p_nombre, p_dni, 'portal');
end;
$$;
