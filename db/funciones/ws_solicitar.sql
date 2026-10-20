-- Vigente según migrations/20261015162658_calendario-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_solicitar(p_titulo text, p_descripcion text, p_area public.area default null, p_prioridad public.prioridad default 'media', p_fecha_deseada date default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  if v_empresa is null or not public.ws_modulo_activo('solicitudes') then
    raise exception 'No tienes acceso a solicitudes' using errcode = '42501';
  end if;
  if p_titulo is null or length(trim(p_titulo)) < 3 then
    raise exception 'Escribe qué necesitas en el título' using errcode = '22023';
  end if;
  if length(p_titulo) > 200 or length(coalesce(p_descripcion, '')) > 4000 then
    raise exception 'El texto es demasiado largo' using errcode = '22023';
  end if;
  if p_fecha_deseada is not null and p_fecha_deseada < v_hoy then
    raise exception 'La fecha deseada no puede ser pasada' using errcode = '22023';
  end if;
  -- Límite simple contra abusos: 20 solicitudes por día y empresa.
  if (select count(*) from public.solicitudes s where s.cliente_id = v_empresa and s.created_at > now() - interval '1 day') >= 20 then
    raise exception 'Llegaste al límite de solicitudes por hoy. Escríbenos directamente.' using errcode = '22023';
  end if;

  select c.owner_id into v_owner from public.clientes c where c.id = v_empresa;
  insert into public.solicitudes (owner_id, cliente_id, titulo, descripcion, area, prioridad, fecha_deseada)
  values (v_owner, v_empresa, trim(p_titulo), nullif(trim(coalesce(p_descripcion, '')), ''), p_area, coalesce(p_prioridad, 'media'), p_fecha_deseada)
  returning id into v_id;
  return v_id;
end;
$$;
