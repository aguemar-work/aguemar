-- Vigente según migrations/20261023151851_reunion-solicitudes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_pedir_reunion(p_tema text, p_detalle text, p_fecha date, p_hora time default null, p_modalidad text default 'virtual')
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
  if v_empresa is null or not public.ws_modulo_activo('calendario') then
    raise exception 'No tienes acceso al calendario' using errcode = '42501';
  end if;
  if p_tema is null or length(trim(p_tema)) < 3 then
    raise exception 'Cuéntanos de qué quieres hablar' using errcode = '22023';
  end if;
  if length(p_tema) > 200 or length(coalesce(p_detalle, '')) > 4000 then
    raise exception 'El texto es demasiado largo' using errcode = '22023';
  end if;
  if p_fecha is null then
    raise exception 'Elige el día que prefieres' using errcode = '22023';
  end if;
  if p_fecha < v_hoy then
    raise exception 'La fecha no puede ser pasada' using errcode = '22023';
  end if;
  if p_fecha > v_hoy + 365 then
    raise exception 'Elige una fecha dentro del próximo año' using errcode = '22023';
  end if;
  if coalesce(p_modalidad, 'virtual') not in ('virtual', 'presencial') then
    raise exception 'Elige si la reunión es virtual o presencial' using errcode = '22023';
  end if;
  -- Límite simple contra abusos: 5 pedidos de reunión por día y empresa.
  if (select count(*) from public.solicitudes s where s.cliente_id = v_empresa and s.tipo = 'reunion' and s.created_at > now() - interval '1 day') >= 5 then
    raise exception 'Llegaste al límite de pedidos de reunión por hoy. Escríbenos directamente.' using errcode = '22023';
  end if;

  select c.owner_id into v_owner from public.clientes c where c.id = v_empresa;
  insert into public.solicitudes (owner_id, cliente_id, tipo, titulo, descripcion, prioridad, fecha_deseada, hora_deseada, modalidad)
  values (v_owner, v_empresa, 'reunion', trim(p_tema), nullif(trim(coalesce(p_detalle, '')), ''), 'media', p_fecha, p_hora, coalesce(p_modalidad, 'virtual'))
  returning id into v_id;
  return v_id;
end;
$$;
