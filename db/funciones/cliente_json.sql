-- Vigente según migrations/20261015154905_briefs-actas.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cliente_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
  from public.clientes c where c.id = p_id;
$$;
