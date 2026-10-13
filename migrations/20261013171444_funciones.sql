-- =====================================================================
-- agueMar Studio · Funciones
-- - siguiente_numero: numeración correlativa por año con bloqueo de fila.
-- - asignar_numero: trigger en cotizaciones y fichas.
-- - portal_documento / crear_lead / aceptar_cotizacion: acceso público controlado.
-- =====================================================================

-- ---------- Numeración correlativa ----------
-- Devuelve COT-2026-001, FT-2026-001, ... Atómica: el upsert bloquea la fila
-- del contador hasta que la transacción termina, así nunca se repite un número.
create or replace function public.siguiente_numero(p_tipo text, p_anio integer, p_owner uuid default auth.uid())
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_ultimo integer;
begin
  if p_owner is null then
    raise exception 'Se requiere un usuario autenticado para numerar';
  end if;
  if p_tipo not in ('COT', 'FT') then
    raise exception 'Tipo de numeración desconocido: %', p_tipo;
  end if;

  insert into public.contadores as c (owner_id, tipo, anio, ultimo)
  values (p_owner, p_tipo, p_anio, 1)
  on conflict (owner_id, tipo, anio)
  do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_ultimo;

  return format('%s-%s-%s', p_tipo, p_anio, lpad(v_ultimo::text, 3, '0'));
end;
$$;

create or replace function public.asignar_numero()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_tipo text;
begin
  if new.numero is not null and new.numero <> '' then
    return new;
  end if;
  v_tipo := case tg_table_name when 'cotizaciones' then 'COT' when 'fichas' then 'FT' end;
  new.numero := public.siguiente_numero(v_tipo, extract(year from new.fecha)::integer, new.owner_id);
  return new;
end;
$$;

create trigger cotizaciones_numero before insert on public.cotizaciones
  for each row execute function public.asignar_numero();
create trigger fichas_numero before insert on public.fichas
  for each row execute function public.asignar_numero();

-- ---------- Vencimiento de cotizaciones ----------
-- Marca como vencidas las enviadas cuya validez ya pasó. Se llama al leer o desde una tarea.
create or replace function public.vencer_cotizaciones(p_owner uuid default auth.uid())
returns integer
language sql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with v as (
    update public.cotizaciones
    set estado = 'vencida'
    where owner_id = p_owner
      and estado = 'enviada'
      and fecha + validez_dias < (now() at time zone 'America/Lima')::date
    returning 1
  )
  select count(*)::integer from v;
$$;

-- ---------- Portal público ----------
-- Devuelve el documento asociado a un token válido. Registra la vista.
-- Se completa en la Fase 6 (ítems, hijos de ficha, PDF); aquí ya devuelve lo esencial.
create or replace function public.portal_documento(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
  v_marca jsonb;
  v_doc jsonb;
  v_cliente jsonb;
begin
  select * into v_enlace
  from public.enlaces_publicos
  where token = p_token and revocado = false;

  if not found then
    return null;
  end if;

  update public.enlaces_publicos
  set vistas = vistas + 1, ultima_vista = now()
  where id = v_enlace.id;

  select to_jsonb(pm) - 'owner_id' - 'id' into v_marca
  from public.perfil_marca pm
  where pm.owner_id = v_enlace.owner_id;

  if v_enlace.tipo = 'cotizacion' then
    select to_jsonb(c) - 'owner_id', to_jsonb(cl) - 'owner_id'
    into v_doc, v_cliente
    from public.cotizaciones c
    join public.clientes cl on cl.id = c.cliente_id
    where c.id = v_enlace.documento_id and c.owner_id = v_enlace.owner_id;
  else
    select to_jsonb(f) - 'owner_id', to_jsonb(cl) - 'owner_id'
    into v_doc, v_cliente
    from public.fichas f
    join public.clientes cl on cl.id = f.cliente_id
    where f.id = v_enlace.documento_id and f.owner_id = v_enlace.owner_id;
  end if;

  if v_doc is null then
    return null;
  end if;

  return jsonb_build_object(
    'tipo', v_enlace.tipo,
    'documento', v_doc,
    'cliente', v_cliente,
    'marca', coalesce(v_marca, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.portal_documento(text) from public;
grant execute on function public.portal_documento(text) to anon, authenticated;

-- ---------- Leads desde la landing ----------
-- Inserta un lead asignándolo al propietario de la marca (primer perfil creado).
-- Límite: 5 envíos por IP cada hora.
create or replace function public.crear_lead(
  p_nombre text,
  p_telefono text,
  p_correo text,
  p_servicio text,
  p_mensaje text,
  p_ip inet default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_recientes integer;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Nombre requerido' using errcode = '22023';
  end if;

  if p_ip is not null then
    select count(*) into v_recientes
    from public.leads
    where ip = p_ip and created_at > now() - interval '1 hour';
    if v_recientes >= 5 then
      raise exception 'Demasiados envíos desde esta dirección. Intenta en una hora.' using errcode = '53400';
    end if;
  end if;

  select owner_id into v_owner from public.perfil_marca order by created_at limit 1;

  insert into public.leads (owner_id, nombre, telefono, correo, servicio, mensaje, ip, user_agent)
  values (v_owner, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_correo), ''),
          nullif(trim(p_servicio), ''), nullif(trim(p_mensaje), ''), p_ip, p_user_agent)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.crear_lead(text, text, text, text, text, inet, text) from public;
grant execute on function public.crear_lead(text, text, text, text, text, inet, text) to anon, authenticated;

-- ---------- Aceptación de cotización desde el portal ----------
create or replace function public.aceptar_cotizacion(
  p_token text,
  p_nombre text,
  p_dni text,
  p_ip inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
  v_cot public.cotizaciones%rowtype;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Escribe tu nombre completo' using errcode = '22023';
  end if;
  if p_dni !~ '^\d{8}$' then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;

  select * into v_enlace
  from public.enlaces_publicos
  where token = p_token and revocado = false and tipo = 'cotizacion';
  if not found then
    raise exception 'Enlace no válido' using errcode = 'P0002';
  end if;

  select * into v_cot from public.cotizaciones
  where id = v_enlace.documento_id and owner_id = v_enlace.owner_id
  for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'aceptada' then
    return jsonb_build_object('ok', true, 'ya_aceptada', true);
  end if;
  if v_cot.estado in ('rechazada', 'vencida')
     or v_cot.fecha + v_cot.validez_dias < (now() at time zone 'America/Lima')::date then
    raise exception 'Esta cotización ya no está vigente' using errcode = '22023';
  end if;

  insert into public.aceptaciones (owner_id, cotizacion_id, nombre, dni, ip, user_agent)
  values (v_cot.owner_id, v_cot.id, trim(p_nombre), p_dni, p_ip, p_user_agent);

  update public.cotizaciones
  set estado = 'aceptada', aceptada_en = now()
  where id = v_cot.id;

  return jsonb_build_object('ok', true, 'ya_aceptada', false, 'numero', v_cot.numero);
end;
$$;

revoke all on function public.aceptar_cotizacion(text, text, text, inet, text) from public;
grant execute on function public.aceptar_cotizacion(text, text, text, inet, text) to anon, authenticated;
