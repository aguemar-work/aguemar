-- Vigente según migrations/20261020210512_sprint2-medicion.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.registrar_evento(p_evento text, p_origen text default 'directo')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_origen text := coalesce(nullif(p_origen, ''), 'directo');
begin
  if p_evento is null or p_evento not in ('whatsapp_click', 'correo_click', 'contacto_enviado') then
    raise exception 'Evento desconocido' using errcode = '22023';
  end if;
  if v_origen not in ('google', 'bing', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'correo', 'campana', 'otro', 'directo') then
    v_origen := 'otro';
  end if;
  v_owner := public.propietario_id();
  if v_owner is null then
    return;
  end if;
  insert into public.eventos_landing as e (owner_id, dia, evento, origen, total)
  values (v_owner, (now() at time zone 'America/Lima')::date, p_evento, v_origen, 1)
  on conflict (owner_id, dia, evento, origen) do update
    set total = e.total + 1
    where e.total < 500;
end;
$$;
