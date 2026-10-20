-- Vigente según migrations/20261013171433_esquema-base.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.generar_token()
returns text
language sql
volatile
as $$
  select translate(encode(public.gen_random_bytes(32), 'base64'), '+/=', '-_');
$$;
