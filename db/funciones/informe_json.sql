-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.informe_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', i.id, 'numero', i.numero, 'fecha', i.fecha, 'area', i.area, 'titulo', i.titulo,
    'periodo_inicio', i.periodo_inicio, 'periodo_fin', i.periodo_fin, 'resumen', i.resumen,
    'indicadores', i.indicadores, 'secciones', i.secciones,
    'publicado', i.publicado, 'publicado_en', i.publicado_en,
    'trabajo', (select t.titulo from public.trabajos t where t.id = i.trabajo_id),
    'cliente', public.cliente_json(i.cliente_id),
    'marca', public.marca_json(i.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'informe' and p.documento_id = i.id and not p.revocado)
  )
  from public.informes i where i.id = p_id;
$$;
