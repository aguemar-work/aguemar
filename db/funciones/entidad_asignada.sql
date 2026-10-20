-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.entidad_asignada(p_entidad public.entidad_comentario, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case p_entidad::text
    when 'trabajo' then public.trabajo_asignado(p_id)
    when 'actividad' then exists (select 1 from public.actividades a where a.id = p_id and public.cliente_asignado(a.cliente_id))
    when 'informe' then public.documento_asignado('informe', p_id)
    when 'documento' then public.documento_asignado('ficha', p_id) or public.documento_asignado('brief', p_id) or public.documento_asignado('acta', p_id)
    else false
  end;
$$;
