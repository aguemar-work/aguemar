-- Inmutabilidad de lo aceptado (ARQUITECTURA.md, ADR-07).
--
-- 1. Al aceptar una cotización o un acta se guarda una copia del documento tal como se
--    aceptó (contenido, empresa y Mi marca de ese momento) con su huella sha256.
-- 2. cotizacion_json / acta_json superponen esa copia: el PDF, el workspace y el portal
--    muestran lo aceptado aunque después cambien Mi marca o los datos de la empresa.
-- 3. La base impide editar o borrar lo aceptado y registrar una aceptación desde la API
--    (solo cotizacion_aceptar_core / acta_aceptar_core; antes solo lo impedía la app).
-- 4. cotizacion_panel: el PDF del panel sale de la misma proyección que el workspace y el portal.
-- 5. Se retira ws_admin_set_password (sin uso desde la fase 14; escribía en auth.users).
--
-- Compatible con el código publicado: no cambia firmas ni formas de las proyecciones.

-- ---------------------------------------------------------------------
-- 1. Columnas de la copia
-- ---------------------------------------------------------------------
alter table public.aceptaciones
  add column if not exists documento jsonb,
  add column if not exists huella text;

alter table public.actas_entrega
  add column if not exists aceptada_documento jsonb,
  add column if not exists aceptada_huella text;

-- Huella de un documento: sha256 de su jsonb (jsonb normaliza el orden de las claves).
create or replace function public.huella_documento(p_doc jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select encode(sha256(convert_to(p_doc::text, 'UTF8')), 'hex');
$$;
revoke all on function public.huella_documento(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Proyecciones: en vivo, contenido congelable y la pública con la copia encima
-- ---------------------------------------------------------------------
-- Mismo cuerpo que cotizacion_json hasta hoy (migración miembros-cierre-base).
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
    'items', coalesce((select jsonb_agg(jsonb_build_object('descripcion', i.descripcion, 'unidad', i.unidad, 'cantidad', i.cantidad,
                                                           'precio_unitario', i.precio_unitario, 'descuento', i.descuento, 'importe', i.importe)
                                        order by i.orden, i.created_at)
                       from public.cotizacion_items i where i.cotizacion_id = z.id), '[]'::jsonb),
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id), 0),
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = z.cliente_id),
    'marca', public.marca_json(z.owner_id)
  )
  from public.cotizaciones z where z.id = p_id;
$$;
revoke all on function public.cotizacion_json_vivo(uuid) from public, anon, authenticated;

-- Lo que se congela al aceptar: todo menos el estado, la aceptación y lo cobrado, que siguen vivos.
create or replace function public.cotizacion_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         - array['id', 'estado', 'enviada_en', 'aceptada_en', 'trabajo_id', 'aceptacion', 'cobrado'];
$$;
revoke all on function public.cotizacion_contenido(uuid) from public, anon, authenticated;

create or replace function public.cotizacion_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         || coalesce((select a.documento from public.aceptaciones a
                      where a.cotizacion_id = p_id and a.documento is not null
                      order by a.aceptado_en desc limit 1), '{}'::jsonb);
$$;
revoke all on function public.cotizacion_json(uuid) from public, anon, authenticated;

-- Mismo cuerpo que acta_json hasta hoy (migración miembros-cierre-base).
create or replace function public.acta_json_vivo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id, 'numero', a.numero, 'fecha', a.fecha, 'area', a.area, 'titulo', a.titulo, 'resumen', a.resumen,
    'entregables', a.entregables, 'observaciones', a.observaciones,
    'publicada', a.publicada, 'publicada_en', a.publicada_en,
    'aceptacion', case when a.aceptada_en is null then null
                       else jsonb_build_object('nombre', a.aceptada_nombre, 'dni', public.dni_visible(a.aceptada_dni), 'aceptado_en', a.aceptada_en) end,
    'trabajo', (select t.titulo from public.trabajos t where t.id = a.trabajo_id),
    'cliente', public.cliente_json(a.cliente_id),
    'marca', public.marca_json(a.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'acta' and p.documento_id = a.id and not p.revocado)
  )
  from public.actas_entrega a where a.id = p_id;
$$;
revoke all on function public.acta_json_vivo(uuid) from public, anon, authenticated;

create or replace function public.acta_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json_vivo(p_id) - array['id', 'publicada', 'publicada_en', 'aceptacion', 'token'];
$$;
revoke all on function public.acta_contenido(uuid) from public, anon, authenticated;

create or replace function public.acta_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.acta_json_vivo(p_id)
         || coalesce((select a.aceptada_documento from public.actas_entrega a where a.id = p_id), '{}'::jsonb);
$$;
revoke all on function public.acta_json(uuid) from public, anon, authenticated;

-- PDF del panel: la misma proyección que el workspace y el portal (DNI completo para el propietario).
create or replace function public.cotizacion_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json(z.id) from public.cotizaciones z
  where z.id = p_id and z.owner_id = auth.uid() and public.es_propietario();
$$;
revoke all on function public.cotizacion_panel(uuid) from public, anon;
grant execute on function public.cotizacion_panel(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Lo ya aceptado: copia con los datos de hoy (lo mejor disponible) y huella.
--    Va antes de los triggers de bloqueo.
-- ---------------------------------------------------------------------
update public.aceptaciones a
set documento = public.cotizacion_contenido(a.cotizacion_id)
where a.documento is null
  and exists (select 1 from public.cotizaciones z where z.id = a.cotizacion_id and z.estado = 'aceptada');
update public.aceptaciones
set huella = public.huella_documento(documento)
where documento is not null and huella is null;

update public.actas_entrega
set aceptada_documento = public.acta_contenido(id)
where aceptada_en is not null and aceptada_documento is null;
update public.actas_entrega
set aceptada_huella = public.huella_documento(aceptada_documento)
where aceptada_documento is not null and aceptada_huella is null;

-- ---------------------------------------------------------------------
-- 4. Aceptar guarda la copia. Mismo cuerpo que antes más la copia.
-- ---------------------------------------------------------------------
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

create or replace function public.acta_aceptar_core(p_id uuid, p_nombre text, p_dni text, p_por text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_acta public.actas_entrega%rowtype;
  v_doc jsonb;
begin
  select * into v_acta from public.actas_entrega where id = p_id for update;
  if not found then
    raise exception 'Acta no encontrada' using errcode = 'P0002';
  end if;
  if v_acta.aceptada_en is not null then
    return jsonb_build_object('ok', true, 'ya_aceptada', true);
  end if;
  if p_por <> 'propietario' and not v_acta.publicada then
    raise exception 'Esta acta todavía no está disponible' using errcode = '22023';
  end if;
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Escribe el nombre de quien recibe' using errcode = '22023';
  end if;
  if p_por <> 'propietario' and p_dni is null then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;
  if p_dni is not null and p_dni !~ '^\d{8}$' then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;

  v_doc := public.acta_contenido(p_id);

  update public.actas_entrega
  set aceptada_en = now(), aceptada_nombre = trim(p_nombre), aceptada_dni = p_dni, aceptada_por = p_por,
      aceptada_documento = v_doc, aceptada_huella = public.huella_documento(v_doc)
  where id = p_id;

  -- La entrega conforme cierra el ciclo del trabajo.
  update public.trabajos
  set estado = 'entregado', fecha_entrega = coalesce(fecha_entrega, (now() at time zone 'America/Lima')::date)
  where id = v_acta.trabajo_id and estado in ('propuesta', 'en_curso', 'en_revision');

  return jsonb_build_object('ok', true, 'ya_aceptada', false, 'numero', v_acta.numero);
end;
$$;
revoke all on function public.acta_aceptar_core(uuid, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Bloqueos: lo aceptado no se edita ni se borra, y solo se acepta por el núcleo
-- ---------------------------------------------------------------------
create or replace function public.cotizacion_aceptada_fija()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  -- Dentro de cotizacion_aceptar_core (security definer) current_user es el dueño de la función;
  -- desde la API es anon o authenticated.
  v_aceptando boolean := current_user not in ('anon', 'authenticated');
begin
  if tg_op = 'DELETE' then
    if old.estado = 'aceptada' then
      raise exception 'Una cotización aceptada no se elimina: tiene un trabajo y quizá cobros asociados.' using errcode = '22023';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.estado = 'aceptada' and not v_aceptando then
      raise exception 'Una cotización se acepta registrando quién la acepta, no creándola aceptada.' using errcode = '22023';
    end if;
    return new;
  end if;

  if old.estado = 'aceptada' then
    if new.estado is distinct from old.estado
       or (new.numero, new.cliente_id, new.fecha, new.validez_dias, new.asunto, new.area, new.moneda,
           new.igv_pct, new.igv_modo, new.subtotal, new.igv, new.total, new.condiciones, new.aceptada_en)
          is distinct from
          (old.numero, old.cliente_id, old.fecha, old.validez_dias, old.asunto, old.area, old.moneda,
           old.igv_pct, old.igv_modo, old.subtotal, old.igv, old.total, old.condiciones, old.aceptada_en) then
      raise exception 'Una cotización aceptada no se edita: duplícala para hacer otra versión.' using errcode = '22023';
    end if;
  elsif new.estado = 'aceptada' and not v_aceptando then
    raise exception 'Una cotización se acepta registrando quién la acepta, no cambiando su estado.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.cotizacion_aceptada_fija() from public, anon, authenticated;

drop trigger if exists cotizaciones_aceptada_fija on public.cotizaciones;
create trigger cotizaciones_aceptada_fija before insert or update or delete on public.cotizaciones
  for each row execute function public.cotizacion_aceptada_fija();

-- Las líneas de una cotización aceptada tampoco cambian. security definer para ver la
-- cotización aunque la RLS de quien llama no la muestre.
create or replace function public.cotizacion_items_fijos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if exists (select 1 from public.cotizaciones z
             where z.id in (old.cotizacion_id, new.cotizacion_id) and z.estado = 'aceptada') then
    raise exception 'Una cotización aceptada no se edita: duplícala para hacer otra versión.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.cotizacion_items_fijos() from public, anon, authenticated;

drop trigger if exists cotizacion_items_fijos on public.cotizacion_items;
create trigger cotizacion_items_fijos before insert or update or delete on public.cotizacion_items
  for each row execute function public.cotizacion_items_fijos();

create or replace function public.acta_aceptada_fija()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  -- Dentro de acta_aceptar_core (security definer) current_user es el dueño de la función;
  -- desde la API es anon o authenticated.
  v_aceptando boolean := current_user not in ('anon', 'authenticated');
begin
  if tg_op = 'DELETE' then
    if old.aceptada_en is not null then
      raise exception 'Un acta aceptada no se elimina: es el registro de la conformidad.' using errcode = '22023';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if (new.aceptada_en is not null or new.aceptada_documento is not null) and not v_aceptando then
      raise exception 'Un acta se acepta registrando quién la recibe, no creándola aceptada.' using errcode = '22023';
    end if;
    return new;
  end if;

  if (new.aceptada_en, new.aceptada_nombre, new.aceptada_dni, new.aceptada_por, new.aceptada_documento, new.aceptada_huella)
     is distinct from
     (old.aceptada_en, old.aceptada_nombre, old.aceptada_dni, old.aceptada_por, old.aceptada_documento, old.aceptada_huella)
     and not v_aceptando then
    raise exception 'La aceptación de un acta solo se registra al aceptarla.' using errcode = '22023';
  end if;
  if old.aceptada_en is not null
     and (new.numero, new.cliente_id, new.area, new.fecha, new.titulo, new.resumen, new.entregables, new.observaciones)
         is distinct from
         (old.numero, old.cliente_id, old.area, old.fecha, old.titulo, old.resumen, old.entregables, old.observaciones) then
    raise exception 'Un acta aceptada no se edita: es el registro de la conformidad.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function public.acta_aceptada_fija() from public, anon, authenticated;

drop trigger if exists actas_entrega_aceptada_fija on public.actas_entrega;
create trigger actas_entrega_aceptada_fija before insert or update or delete on public.actas_entrega
  for each row execute function public.acta_aceptada_fija();

-- ---------------------------------------------------------------------
-- 6. Fuera ws_admin_set_password (la fase 14 la reemplazó por invitaciones y códigos de InsForge)
-- ---------------------------------------------------------------------
drop function if exists public.ws_admin_set_password(uuid, text);
