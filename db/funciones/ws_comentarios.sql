-- Vigente según migrations/20261014152859_empresas-workspaces.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_comentarios(p_entidad public.entidad_comentario, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'es_propietario', k.es_propietario, 'texto', k.texto, 'created_at', k.created_at) order by k.created_at), '[]'::jsonb)
  from public.comentarios k
  where k.cliente_id = public.ws_empresa_id() and k.entidad = p_entidad and k.entidad_id = p_id;
$$;
