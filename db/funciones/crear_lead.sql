-- Vigente según migrations/20261016161523_miembros-cierre-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.crear_lead(
  p_nombre text, p_telefono text, p_correo text, p_servicio text, p_mensaje text,
  p_ip inet default null, p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Nombre requerido' using errcode = '22023';
  end if;
  if length(p_nombre) > 120 or length(coalesce(p_telefono, '')) > 30 or length(coalesce(p_correo, '')) > 160
     or length(coalesce(p_servicio, '')) > 120 or length(coalesce(p_mensaje, '')) > 3000 then
    raise exception 'Algún dato es demasiado largo.' using errcode = '22001';
  end if;

  -- Tope global: aunque alguien llame la función directamente con la clave anónima y sin IP.
  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiados envíos en este momento. Intenta en una hora.' using errcode = '53400';
  end if;
  if p_ip is not null
     and (select count(*) from public.leads where ip = p_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados envíos desde esta dirección. Intenta en una hora.' using errcode = '53400';
  end if;

  v_owner := public.propietario_id();
  if v_owner is null then
    raise exception 'El formulario no está disponible ahora.' using errcode = '55000';
  end if;

  insert into public.leads (owner_id, nombre, telefono, correo, servicio, mensaje, ip, user_agent)
  values (v_owner, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_correo), ''),
          nullif(trim(p_servicio), ''), nullif(trim(p_mensaje), ''), p_ip, left(p_user_agent, 300))
  returning id into v_id;

  return v_id;
end;
$$;
