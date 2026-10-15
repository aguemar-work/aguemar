-- ws_documentos mantiene los campos que usa el código ya publicado (7a): estado_final, equipo y tipo_servicio,
-- además de los nuevos (estado, detalle, area) para briefs y actas.
create or replace function public.ws_documentos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with emp as (select public.ws_empresa_id() as id where public.ws_modulo_activo('documentos')),
  docs as (
    select f.id, 'ficha'::text as tipo, f.numero, f.fecha, f.titular as titulo, 'soporte'::text as area,
           f.estado_final::text as estado,
           (select concat_ws(' ', e.marca, e.modelo) || ' · ' || e.serie from public.equipos e where e.id = f.equipo_id) as detalle,
           f.estado_final::text as estado_final, f.tipo_servicio
    from public.fichas f, emp where f.cliente_id = emp.id and f.publicada
    union all
    select b.id, 'brief', b.numero, b.fecha, b.titulo, b.area::text, null,
           (select t.titulo from public.trabajos t where t.id = b.trabajo_id), null, null
    from public.briefs b, emp where b.cliente_id = emp.id and b.publicado
    union all
    select a.id, 'acta', a.numero, a.fecha, a.titulo, a.area::text,
           case when a.aceptada_en is null then 'por_aceptar' else 'aceptada' end,
           (select t.titulo from public.trabajos t where t.id = a.trabajo_id), null, null
    from public.actas_entrega a, emp where a.cliente_id = emp.id and a.publicada
  )
  select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object('equipo', case when d.tipo = 'ficha' then d.detalle end)
                            order by d.fecha desc, d.numero desc), '[]'::jsonb)
  from docs d;
$$;
