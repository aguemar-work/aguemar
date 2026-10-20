-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.invitacion_renovar(p_id uuid)
returns text
language sql
set search_path = pg_catalog, public, pg_temp
as $$
  update public.invitaciones
     set token = public.generar_token(), expira_en = now() + interval '7 days', revocada = false
   where id = p_id and usada_en is null
  returning token;
$$;
