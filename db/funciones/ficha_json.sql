-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ficha_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', f.id, 'numero', f.numero, 'fecha', f.fecha, 'tipo_servicio', f.tipo_servicio, 'modalidad', f.modalidad,
    'titular', f.titular, 'resumen', f.resumen, 'estado_final', f.estado_final, 'indicadores', f.indicadores,
    'proximo_mantenimiento', f.proximo_mantenimiento, 'publicada', f.publicada, 'publicada_en', f.publicada_en,
    'equipo', (select jsonb_build_object('marca', e.marca, 'modelo', e.modelo, 'serie', e.serie, 'sistema_operativo', e.sistema_operativo,
                                         'procesador', e.procesador, 'ram', e.ram, 'almacenamiento', e.almacenamiento, 'grafica', e.grafica,
                                         'bateria', e.bateria, 'bios', e.bios)
               from public.equipos e where e.id = f.equipo_id),
    'diagnosticos', coalesce((select jsonb_agg(jsonb_build_object('elemento', d.elemento, 'resultado', d.resultado, 'estado', d.estado) order by d.orden, d.created_at)
                              from public.ficha_diagnosticos d where d.ficha_id = f.id), '[]'::jsonb),
    'trabajos', coalesce((select jsonb_agg(jsonb_build_object('titulo', t.titulo, 'detalle', t.detalle, 'hecho', t.hecho) order by t.orden, t.created_at)
                          from public.ficha_trabajos t where t.ficha_id = f.id), '[]'::jsonb),
    'incidencias', coalesce((select jsonb_agg(jsonb_build_object('titulo', i.titulo, 'causa', i.causa, 'solucion', i.solucion, 'estado', i.estado) order by i.orden, i.created_at)
                             from public.ficha_incidencias i where i.ficha_id = f.id), '[]'::jsonb),
    'recomendaciones', coalesce((select jsonb_agg(r.texto order by r.orden, r.created_at)
                                 from public.ficha_recomendaciones r where r.ficha_id = f.id), '[]'::jsonb),
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = f.cliente_id),
    'marca', public.marca_json(f.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'ficha' and p.documento_id = f.id and not p.revocado)
  )
  from public.fichas f where f.id = p_id;
$$;
