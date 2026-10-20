-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_aceptar_acta(p_id uuid, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.ws_modulo_activo('documentos')
     or not exists (select 1 from public.actas_entrega a where a.id = p_id and a.cliente_id = public.ws_empresa_id() and a.publicada) then
    raise exception 'Acta no encontrada' using errcode = 'P0002';
  end if;
  return public.acta_aceptar_core(p_id, p_nombre, p_dni, 'empresa');
end;
$$;
