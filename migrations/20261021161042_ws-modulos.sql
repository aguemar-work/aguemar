-- T-18 · ARQ-006 · ws_trabajos, ws_trabajo y ws_comentarios comprueban el módulo activo.
--
-- El principio del workspace es que la base decide qué ve cada empresa (CLAUDE.md, "Seguridad"). Las
-- demás funciones ws_* ya exigen ws_modulo_activo(...); estas tres solo filtraban por empresa y por
-- visible, y el 404 de un módulo inactivo lo ponía la página. Una empresa con Proyectos desactivado
-- podía listar sus trabajos visibles llamando a la API con su token.
--
--   ws_trabajos, ws_trabajo  exigen el módulo "proyectos".
--   ws_comentarios           exige el módulo de la entidad: trabajo → proyectos, actividad →
--                            calendario, informe → informes, documento → documentos,
--                            cotizacion → cotizaciones.
--
-- Sin cambios de firma ni de permisos (create or replace conserva los grants). Compatible con el código
-- publicado: sus páginas ya devuelven 404 con el módulo inactivo y, con él activo, ven lo mismo.

create or replace function public.ws_trabajos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(fila order by
      case t.estado when 'en_curso' then 1 when 'en_revision' then 2 when 'propuesta' then 3 when 'entregado' then 4 else 5 end,
      t.fecha_compromiso nulls last, t.created_at desc), '[]'::jsonb)
  from public.trabajos t
  cross join lateral (
    select jsonb_build_object(
      'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
      'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
      'tareas_hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha),
      'tareas_total', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
      'comentarios', (select count(*) from public.comentarios k where k.entidad = 'trabajo' and k.entidad_id = t.id)
    ) as fila
  ) f
  where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado'
    and public.ws_modulo_activo('proyectos');
$$;

create or replace function public.ws_trabajo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
    'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
    'etapas', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'hecha', e.hecha, 'orden', e.orden) order by e.orden, e.created_at), '[]'::jsonb)
               from public.trabajo_etapas e where e.trabajo_id = t.id),
    'tareas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'etapa_id', x.etapa_id, 'titulo', x.titulo, 'hecha', x.hecha, 'fecha_limite', x.fecha_limite, 'orden', x.orden) order by x.orden, x.created_at), '[]'::jsonb)
               from public.trabajo_tareas x where x.trabajo_id = t.id),
    'entregables', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nombre', d.nombre, 'tipo', d.tipo, 'url', d.url, 'nota', d.nota) order by d.orden, d.created_at), '[]'::jsonb)
                    from public.trabajo_entregables d where d.trabajo_id = t.id)
  )
  from public.trabajos t
  where t.id = p_id and t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado'
    and public.ws_modulo_activo('proyectos');
$$;

create or replace function public.ws_comentarios(p_entidad public.entidad_comentario, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'es_propietario', k.es_propietario, 'texto', k.texto, 'created_at', k.created_at) order by k.created_at), '[]'::jsonb)
  from public.comentarios k
  where k.cliente_id = public.ws_empresa_id() and k.entidad = p_entidad and k.entidad_id = p_id
    and public.ws_modulo_activo(case p_entidad
      when 'trabajo' then 'proyectos'
      when 'actividad' then 'calendario'
      when 'informe' then 'informes'
      when 'documento' then 'documentos'
      when 'cotizacion' then 'cotizaciones'
    end);
$$;
