-- Vigente según migrations/20261021224712_anulaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_anular(p_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_cot public.cotizaciones%rowtype;
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario anula cotizaciones' using errcode = '42501';
  end if;
  select * into v_cot from public.cotizaciones where id = p_id and owner_id = auth.uid() for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'anulada' then
    return jsonb_build_object('ok', true, 'ya_anulada', true, 'numero', v_cot.numero);
  end if;
  if v_cot.estado <> 'aceptada' then
    raise exception 'Solo se anula una cotización aceptada' using errcode = '22023';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Escribe el motivo de la anulación' using errcode = '22023';
  end if;
  update public.cotizaciones
  set estado = 'anulada', anulada_en = now(), anulada_motivo = trim(p_motivo), anulada_por = auth.uid()
  where id = v_cot.id;
  return jsonb_build_object('ok', true, 'ya_anulada', false, 'numero', v_cot.numero);
end;
$$;
