-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
