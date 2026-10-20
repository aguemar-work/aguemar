-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.brief_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', b.id, 'numero', b.numero, 'fecha', b.fecha, 'area', b.area, 'titulo', b.titulo,
    'objetivo', b.objetivo, 'contexto', b.contexto, 'publico', b.publico, 'alcance', b.alcance,
    'fuera_alcance', b.fuera_alcance, 'entregables', b.entregables, 'referencias', b.referencias,
    'fecha_entrega', b.fecha_entrega, 'publicado', b.publicado, 'publicado_en', b.publicado_en,
    'trabajo', (select t.titulo from public.trabajos t where t.id = b.trabajo_id),
    'cliente', public.cliente_json(b.cliente_id),
    'marca', public.marca_json(b.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'brief' and p.documento_id = b.id and not p.revocado)
  )
  from public.briefs b where b.id = p_id;
$$;
