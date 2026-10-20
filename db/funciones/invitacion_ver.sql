-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.invitacion_ver(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'tipo', i.tipo,
    'correo', i.correo,
    'nombre', i.nombre,
    'empresa', (select c.nombre from public.clientes c where c.id = i.cliente_id),
    'estudio', (select p.nombre_comercial from public.perfil_marca p where p.owner_id = i.owner_id),
    'estado', case
      when i.usada_en is not null then 'usada'
      when i.revocada then 'revocada'
      when i.expira_en < now() then 'vencida'
      else 'vigente'
    end
  )
  from public.invitaciones i
  where p_token ~ '^[A-Za-z0-9_-]{40,64}$' and i.token = p_token;
$$;
