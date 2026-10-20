-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.portal_documento(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
  v_doc jsonb;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;
  select * into v_enlace from public.enlaces_publicos where token = p_token and revocado = false;
  if not found then
    return null;
  end if;

  if v_enlace.tipo::text = 'ficha' then
    select public.ficha_json(f.id) into v_doc from public.fichas f
    where f.id = v_enlace.documento_id and f.owner_id = v_enlace.owner_id and f.publicada;
  elsif v_enlace.tipo::text = 'cotizacion' then
    select public.cotizacion_json(z.id) into v_doc from public.cotizaciones z
    where z.id = v_enlace.documento_id and z.owner_id = v_enlace.owner_id and z.estado <> 'borrador';
  elsif v_enlace.tipo::text = 'brief' then
    select public.brief_json(b.id) into v_doc from public.briefs b
    where b.id = v_enlace.documento_id and b.owner_id = v_enlace.owner_id and b.publicado;
  elsif v_enlace.tipo::text = 'acta' then
    select public.acta_json(a.id) into v_doc from public.actas_entrega a
    where a.id = v_enlace.documento_id and a.owner_id = v_enlace.owner_id and a.publicada;
  elsif v_enlace.tipo::text = 'informe' then
    select public.informe_json(i.id) into v_doc from public.informes i
    where i.id = v_enlace.documento_id and i.owner_id = v_enlace.owner_id and i.publicado;
  end if;
  if v_doc is null then
    return null;
  end if;

  update public.enlaces_publicos set vistas = vistas + 1, ultima_vista = now() where id = v_enlace.id;
  return jsonb_build_object('tipo', v_enlace.tipo, 'documento', v_doc);
end;
$$;
