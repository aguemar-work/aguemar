-- T-17 (definitiva) · SEC-003 · Cómo distingue la app los dos topes de crear_lead.
--
-- Las dos migraciones anteriores (lead-topes y lead-topes-codigos) probaron códigos propios y no
-- llegaron a la app. Comprobado contra staging: PostgREST responde HTTP 400 con su mensaje solo para
-- P0001 (el código de un `raise exception` sin errcode), P0002, la clase 22 y 42501; para cualquier
-- otro P0xxx y para la clase 53 responde 500/503 e InsForge lo enmascara como el texto "Something
-- went wrong", sin código ni mensaje. Por eso el tope por IP (que usaba 53400) nunca rechazaba: la
-- app no podía leerlo y lo trataba como una falla de la base, con respaldo por correo.
--
-- Ahora los dos topes usan P0001 y se distinguen por `hint`, que sí viaja hasta la app:
--   hint 'tope_ip'      la app rechaza (es el freno contra quien insiste desde su conexión).
--   hint 'tope_global'  la app lo deriva al respaldo por correo en vez de rechazar al visitante.
-- El tope por IP se comprueba primero. El resto de la función no cambia.

create or replace function public.crear_lead(
  p_nombre text, p_telefono text, p_correo text, p_servicio text, p_mensaje text,
  p_ip inet default null, p_user_agent text default null, p_origen jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
  v_origen text;
  v_referente text;
  v_utm jsonb;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Nombre requerido' using errcode = '22023';
  end if;
  if length(p_nombre) > 120 or length(coalesce(p_telefono, '')) > 30 or length(coalesce(p_correo, '')) > 160
     or length(coalesce(p_servicio, '')) > 120 or length(coalesce(p_mensaje, '')) > 3000 then
    raise exception 'Algún dato es demasiado largo.' using errcode = '22001';
  end if;

  -- Primero el tope por IP (hint 'tope_ip'): el freno contra quien insiste desde la misma conexión.
  if p_ip is not null
     and (select count(*) from public.leads where ip = p_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados envíos desde esta dirección. Intenta en una hora.' using errcode = 'P0001', hint = 'tope_ip';
  end if;
  -- Tope global: aunque alguien llame la función directamente con la clave anónima y sin IP.
  -- hint 'tope_global': la app lo deriva al respaldo por correo en vez de rechazar al visitante.
  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Hay muchos mensajes en este momento.' using errcode = 'P0001', hint = 'tope_global';
  end if;

  v_owner := public.propietario_id();
  if v_owner is null then
    raise exception 'El formulario no está disponible ahora.' using errcode = '55000';
  end if;

  -- El origen nunca impide guardar el lead: lo que no cumple se descarta.
  if jsonb_typeof(p_origen) = 'object' then
    v_origen := p_origen ->> 'origen';
    if v_origen is not null and v_origen not in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo') then
      v_origen := 'otro';
    end if;
    v_referente := nullif(left(lower(p_origen ->> 'referente'), 100), '');
    if v_referente is not null and v_referente !~ '^[a-z0-9.-]+$' then
      v_referente := null;
    end if;
    if jsonb_typeof(p_origen -> 'utm') = 'object' then
      select nullif(jsonb_strip_nulls(jsonb_build_object(
               'source', nullif(left(p_origen -> 'utm' ->> 'source', 80), ''),
               'medium', nullif(left(p_origen -> 'utm' ->> 'medium', 80), ''),
               'campaign', nullif(left(p_origen -> 'utm' ->> 'campaign', 80), ''))), '{}'::jsonb)
      into v_utm;
    end if;
  end if;

  insert into public.leads (owner_id, nombre, telefono, correo, servicio, mensaje, ip, user_agent, origen, referente, utm)
  values (v_owner, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_correo), ''),
          nullif(trim(p_servicio), ''), nullif(trim(p_mensaje), ''), p_ip, left(p_user_agent, 300),
          v_origen, v_referente, v_utm)
  returning id into v_id;

  return v_id;
end;
$$;
