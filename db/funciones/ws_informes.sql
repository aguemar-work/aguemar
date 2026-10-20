-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_informes()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'numero', i.numero, 'fecha', i.fecha, 'area', i.area, 'titulo', i.titulo,
           'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin, 'resumen', i.resumen,
           'publicado_en', i.publicado_en,
           'comentarios', (select count(*) from public.comentarios k where k.entidad = 'informe' and k.entidad_id = i.id)
         ) order by i.periodo_fin desc, i.numero desc), '[]'::jsonb)
  from public.informes i
  where i.cliente_id = public.ws_empresa_id() and i.publicado and public.ws_modulo_activo('informes');
$$;
