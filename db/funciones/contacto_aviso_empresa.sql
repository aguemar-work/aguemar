-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.contacto_aviso_empresa(p_cliente uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'nombre', c.nombre, 'contacto', c.contacto, 'correo', c.correo, 'slug', c.slug, 'modulos', to_jsonb(c.modulos),
    'activa', c.activa, 'avisos_correo', c.avisos_correo,
    'correo_usuario', (select u.email from auth.users u where u.id = c.usuario_id)
  )
  from public.clientes c
  where c.id = p_cliente
    and ((public.es_propietario() and c.owner_id = auth.uid()) or public.cliente_asignado(c.id));
$$;
