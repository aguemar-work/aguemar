-- Vigente según migrations/20261014152859_empresas-workspaces.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.ws_mi_empresa()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'slug', c.slug,
    'modulos', to_jsonb(c.modulos),
    'contacto', c.contacto,
    'marca', (select jsonb_build_object('nombre_comercial', pm.nombre_comercial, 'responsable', pm.responsable, 'telefono', pm.telefono, 'correo', pm.correo)
              from public.perfil_marca pm where pm.owner_id = c.owner_id)
  )
  from public.clientes c
  where c.usuario_id = auth.uid() and c.activa
  limit 1;
$$;
