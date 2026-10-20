-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.documento_asignado(p_tipo public.tipo_documento, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case p_tipo::text
    when 'ficha' then exists (select 1 from public.fichas d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'brief' then exists (select 1 from public.briefs d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'acta' then exists (select 1 from public.actas_entrega d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'informe' then exists (select 1 from public.informes d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    else false
  end;
$$;
