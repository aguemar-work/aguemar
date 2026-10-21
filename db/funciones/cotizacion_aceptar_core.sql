-- Vigente según migrations/20261021224712_anulaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_aceptar_core(
  p_cot uuid,
  p_nombre text,
  p_dni text,
  p_por text,
  p_ip inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_trabajo uuid;
  v_etapa uuid;
  v_doc jsonb;
begin
  select * into v_cot from public.cotizaciones where id = p_cot for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'anulada' then
    raise exception 'Esta cotización fue anulada' using errcode = '22023';
  end if;
  if v_cot.estado = 'aceptada' then
    return jsonb_build_object('ok', true, 'ya_aceptada', true, 'trabajo_id', v_cot.trabajo_id, 'numero', v_cot.numero);
  end if;
  if p_por <> 'propietario' then
    if v_cot.estado <> 'enviada' or v_cot.fecha + v_cot.validez_dias < v_hoy then
      raise exception 'Esta cotización ya no está vigente' using errcode = '22023';
    end if;
    if p_dni is null then
      raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
    end if;
  end if;
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Escribe el nombre de quien acepta' using errcode = '22023';
  end if;
  if p_dni is not null and p_dni !~ '^\d{8}$' then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;
  if v_cot.total <= 0 then
    raise exception 'La cotización no tiene líneas con importe' using errcode = '22023';
  end if;

  v_doc := public.cotizacion_contenido(v_cot.id);
  if v_cot.enviada_documento is not null then
    if (v_doc - array['marca', 'cliente']) is distinct from (v_cot.enviada_documento - array['marca', 'cliente']) then
      raise exception 'La cotización cambió desde que se envió: pide que te la reenvíen' using errcode = '22023';
    end if;
    v_doc := v_cot.enviada_documento;
  end if;

  insert into public.aceptaciones (owner_id, cotizacion_id, nombre, dni, ip, user_agent, registrada_por, documento, huella)
  values (v_cot.owner_id, v_cot.id, trim(p_nombre), p_dni, p_ip, p_user_agent, p_por, v_doc, public.huella_documento(v_doc));

  v_trabajo := v_cot.trabajo_id;
  if v_trabajo is null then
    insert into public.trabajos (owner_id, area, cliente_id, titulo, descripcion, estado, prioridad, fecha_inicio, monto_estimado, moneda, visible_empresa)
    values (
      v_cot.owner_id, v_cot.area, v_cot.cliente_id,
      coalesce(nullif(trim(v_cot.asunto), ''), 'Cotización ' || v_cot.numero),
      'Creado al aceptarse la cotización ' || v_cot.numero || '.',
      'en_curso', 'media', v_hoy, v_cot.total, v_cot.moneda, true
    )
    returning id into v_trabajo;

    insert into public.trabajo_etapas (owner_id, trabajo_id, titulo, orden)
    values (v_cot.owner_id, v_trabajo, 'Alcance', 1)
    returning id into v_etapa;

    insert into public.trabajo_tareas (owner_id, trabajo_id, etapa_id, titulo, orden)
    select v_cot.owner_id, v_trabajo, v_etapa, left(trim(split_part(i.descripcion, E'\n', 1)), 200),
           row_number() over (order by i.orden, i.created_at)
    from public.cotizacion_items i
    where i.cotizacion_id = v_cot.id and length(trim(split_part(i.descripcion, E'\n', 1))) > 0;
  end if;

  update public.cotizaciones
  set estado = 'aceptada', aceptada_en = now(), trabajo_id = v_trabajo, rechazada_en = null, motivo_rechazo = null
  where id = v_cot.id;

  return jsonb_build_object('ok', true, 'ya_aceptada', false, 'trabajo_id', v_trabajo, 'numero', v_cot.numero);
end;
$$;
