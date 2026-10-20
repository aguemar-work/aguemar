-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.acta_json_vivo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id, 'numero', a.numero, 'fecha', a.fecha, 'area', a.area, 'titulo', a.titulo, 'resumen', a.resumen,
    'entregables', a.entregables, 'observaciones', a.observaciones,
    'publicada', a.publicada, 'publicada_en', a.publicada_en,
    'aceptacion', case when a.aceptada_en is null then null
                       else jsonb_build_object('nombre', a.aceptada_nombre, 'dni', public.dni_visible(a.aceptada_dni), 'aceptado_en', a.aceptada_en) end,
    'trabajo', (select t.titulo from public.trabajos t where t.id = a.trabajo_id),
    'cliente', public.cliente_json(a.cliente_id),
    'marca', public.marca_json(a.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'acta' and p.documento_id = a.id and not p.revocado)
  )
  from public.actas_entrega a where a.id = p_id;
$$;
