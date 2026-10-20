-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cliente_asignado(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p_cliente is not null
     and public.es_colaborador()
     and exists (select 1 from public.miembro_empresas me where me.user_id = auth.uid() and me.cliente_id = p_cliente);
$$;
