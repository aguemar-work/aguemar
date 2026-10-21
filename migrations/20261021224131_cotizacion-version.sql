-- T-29 · PRO-001 · D3 · Versionar la cotización al enviarla.
--
-- La cotización se manda por WhatsApp como PDF y se acepta contra lo que muestran el workspace o el
-- portal. Si Alejandro la editaba entre una cosa y otra, la empresa aceptaba una cotización distinta de
-- la que tenía en el teléfono, y nada lo dejaba ver.
--
-- Ahora, al pasar a `enviada` se congela una copia (`enviada_documento`, con su huella sha256):
--  * workspace y portal muestran esa copia (cotizacion_json la superpone a la versión en vivo, y la
--    copia de la aceptación, si existe, a ambas);
--  * aceptar acepta esa copia: si lo que está guardado ya no coincide con ella, la aceptación se
--    rechaza, y lo que se congela al aceptar es la copia enviada, no el estado del momento;
--  * editar una cotización ya enviada descarta la copia, sube `version` y, si estaba `enviada`, la
--    devuelve a `borrador`: hay que reenviarla (y se vuelve a congelar).
-- Las líneas cuentan igual que la cabecera: cualquier cambio en `cotizacion_items` es una edición.
--
-- Una cotización creada directamente como `enviada` por la API no tiene copia (se congela al pasar a
-- `enviada` desde otro estado); en ese caso aceptar usa el contenido de ese momento, como antes. Las
-- que ya estaban enviadas se congelan aquí.

alter table public.cotizaciones
  add column if not exists version integer not null default 1,
  add column if not exists enviada_documento jsonb,
  add column if not exists enviada_huella text;

-- Versión y huella en el documento: la de lo aceptado si existe, si no la de lo enviado.
create or replace function public.cotizacion_json_vivo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', z.id, 'numero', z.numero, 'fecha', z.fecha, 'validez_dias', z.validez_dias, 'vence', z.fecha + z.validez_dias,
    'asunto', z.asunto, 'area', z.area, 'moneda', z.moneda, 'igv_pct', z.igv_pct, 'igv_modo', z.igv_modo,
    'subtotal', z.subtotal, 'igv', z.igv, 'total', z.total, 'condiciones', z.condiciones,
    'estado', case when z.estado = 'enviada' and z.fecha + z.validez_dias < (now() at time zone 'America/Lima')::date then 'vencida' else z.estado::text end,
    'enviada_en', z.enviada_en, 'aceptada_en', z.aceptada_en, 'trabajo_id', z.trabajo_id,
    'version', z.version,
    'huella', coalesce((select a.huella from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1), z.enviada_huella),
    'items', coalesce((select jsonb_agg(jsonb_build_object('descripcion', i.descripcion, 'unidad', i.unidad, 'cantidad', i.cantidad,
                                                           'precio_unitario', i.precio_unitario, 'descuento', i.descuento, 'importe', i.importe)
                                        order by i.orden, i.created_at)
                       from public.cotizacion_items i where i.cotizacion_id = z.id), '[]'::jsonb),
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id), 0),
    'pendiente', d.pendiente, 'vence_pago', d.vence_pago, 'atraso_dias', d.dias_atraso,
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = z.cliente_id),
    'marca', public.marca_json(z.owner_id)
  )
  from public.cotizaciones z
  left join lateral (
    select v.pendiente, v.vence_pago, v.dias_atraso
    from public.deudas_cotizacion(z.cliente_id) v
    where v.cotizacion_id = z.id
  ) d on true
  where z.id = p_id;
$$;

-- Lo que se congela no lleva versión ni huella: la huella es de ese contenido, no parte de él.
create or replace function public.cotizacion_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         - array['id', 'estado', 'enviada_en', 'aceptada_en', 'trabajo_id', 'aceptacion', 'cobrado',
                 'pendiente', 'vence_pago', 'atraso_dias', 'version', 'huella'];
$$;

-- Capas: lo aceptado, si no lo enviado, si no lo vivo.
create or replace function public.cotizacion_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(z.id)
         || coalesce(
              (select a.documento from public.aceptaciones a
               where a.cotizacion_id = z.id and a.documento is not null
               order by a.aceptado_en desc limit 1),
              z.enviada_documento,
              '{}'::jsonb)
  from public.cotizaciones z
  where z.id = p_id;
$$;

revoke all on function public.cotizacion_json_vivo(uuid) from public, anon, authenticated;
revoke all on function public.cotizacion_contenido(uuid) from public, anon, authenticated;
revoke all on function public.cotizacion_json(uuid) from public, anon, authenticated;

-- Editar lo que ya se había enviado: descarta la copia, sube la versión y, si estaba enviada, la
-- devuelve a borrador. Corre después de cotizaciones_totales (orden alfabético), así que compara los
-- totales ya recalculados.
create or replace function public.cotizacion_versionar()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  -- Sin copia, o cambiándola (congelar o descartar): nada que versionar.
  if old.enviada_documento is null or new.enviada_documento is distinct from old.enviada_documento then
    return new;
  end if;
  if (new.cliente_id, new.fecha, new.validez_dias, new.asunto, new.area, new.moneda,
      new.igv_pct, new.igv_modo, new.subtotal, new.igv, new.total, new.condiciones)
     is distinct from
     (old.cliente_id, old.fecha, old.validez_dias, old.asunto, old.area, old.moneda,
      old.igv_pct, old.igv_modo, old.subtotal, old.igv, old.total, old.condiciones) then
    new.enviada_documento := null;
    new.enviada_huella := null;
    new.version := old.version + 1;
    if old.estado = 'enviada' and new.estado = 'enviada' then
      new.estado := 'borrador';
      new.enviada_en := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.cotizacion_versionar() from public, anon, authenticated;

drop trigger if exists cotizaciones_versionar on public.cotizaciones;
create trigger cotizaciones_versionar before update on public.cotizaciones
  for each row execute function public.cotizacion_versionar();

-- Al pasar a enviada desde otro estado se congela la copia. Va después del UPDATE para ver la fecha
-- renovada, las líneas y Mi marca tal como quedaron. security definer para poder volver a escribir
-- la fila sea quien sea quien envía.
create or replace function public.cotizacion_congelar_enviada()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_doc jsonb := public.cotizacion_contenido(new.id);
begin
  update public.cotizaciones
  set enviada_documento = v_doc, enviada_huella = public.huella_documento(v_doc)
  where id = new.id;
  return null;
end;
$$;
revoke all on function public.cotizacion_congelar_enviada() from public, anon, authenticated;

drop trigger if exists cotizaciones_congelar_enviada on public.cotizaciones;
create trigger cotizaciones_congelar_enviada after update of estado on public.cotizaciones
  for each row when (old.estado is distinct from 'enviada' and new.estado = 'enviada')
  execute function public.cotizacion_congelar_enviada();

-- Las líneas son parte de lo enviado: tocarlas descarta la copia y sube la versión. La cabecera no
-- siempre cambia (cambiar una descripción no cambia el total), por eso no basta con cotizaciones_versionar.
create or replace function public.cotizacion_items_versionar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  for v_id in
    select distinct x
    from unnest(array[case when tg_op <> 'INSERT' then old.cotizacion_id end,
                      case when tg_op <> 'DELETE' then new.cotizacion_id end]) as x
    where x is not null
  loop
    update public.cotizaciones
    set enviada_documento = null,
        enviada_huella = null,
        version = version + 1,
        estado = case when estado = 'enviada' then 'borrador'::public.estado_cotizacion else estado end,
        enviada_en = case when estado = 'enviada' then null else enviada_en end
    where id = v_id and enviada_documento is not null and estado <> 'aceptada';
  end loop;
  return null;
end;
$$;
revoke all on function public.cotizacion_items_versionar() from public, anon, authenticated;

drop trigger if exists cotizacion_items_versionar on public.cotizacion_items;
create trigger cotizacion_items_versionar after insert or update or delete on public.cotizacion_items
  for each row execute function public.cotizacion_items_versionar();

-- Aceptar acepta la copia enviada, y solo si lo guardado sigue siendo esa copia (la empresa y el
-- cliente que figuran en ella pueden haber cambiado de datos de contacto sin que eso la invalide).
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
revoke all on function public.cotizacion_aceptar_core(uuid, text, text, text, inet, text) from public, anon, authenticated;

-- Las que ya estaban enviadas quedan congeladas tal como están hoy.
update public.cotizaciones z
set enviada_documento = public.cotizacion_contenido(z.id)
where z.estado = 'enviada' and z.enviada_documento is null;
update public.cotizaciones z
set enviada_huella = public.huella_documento(z.enviada_documento)
where z.enviada_documento is not null and z.enviada_huella is null;
