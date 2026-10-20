-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.equipo_listar()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id, 'nombre', m.nombre, 'correo', u.email, 'activo', m.activo, 'desde', m.created_at,
           'empresas', coalesce((
             select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre) order by c.nombre)
             from public.miembro_empresas me join public.clientes c on c.id = me.cliente_id
             where me.user_id = m.user_id
           ), '[]'::jsonb)
         ) order by m.activo desc, m.nombre), '[]'::jsonb)
  from public.miembros m join auth.users u on u.id = m.user_id
  where m.rol = 'colaborador' and public.es_propietario();
$$;
