-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.obtener_enlace(p_tipo public.tipo_documento, p_id uuid, p_renovar boolean default false)
returns text
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token text;
  v_existe boolean;
  v_dueno uuid := public.dueno_estudio();
begin
  if public.es_propietario() then
    v_existe := case p_tipo::text
      when 'cotizacion' then exists (select 1 from public.cotizaciones where id = p_id and owner_id = auth.uid())
      when 'ficha' then exists (select 1 from public.fichas where id = p_id and owner_id = auth.uid())
      when 'brief' then exists (select 1 from public.briefs where id = p_id and owner_id = auth.uid())
      when 'acta' then exists (select 1 from public.actas_entrega where id = p_id and owner_id = auth.uid())
      when 'informe' then exists (select 1 from public.informes where id = p_id and owner_id = auth.uid())
      else false
    end;
  else
    v_existe := public.documento_asignado(p_tipo, p_id);
  end if;
  if v_dueno is null or not coalesce(v_existe, false) then
    raise exception 'Documento no encontrado' using errcode = 'P0002';
  end if;

  insert into public.enlaces_publicos as e (owner_id, tipo, documento_id)
  values (v_dueno, p_tipo, p_id)
  on conflict (tipo, documento_id) do update
    set revocado = false,
        token = case when p_renovar then public.generar_token() else e.token end
  returning e.token into v_token;
  return v_token;
end;
$$;
