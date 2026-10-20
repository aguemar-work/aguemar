-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.siguiente_numero(p_tipo text, p_anio integer, p_owner uuid default auth.uid())
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_ultimo integer;
begin
  if p_owner is null then
    raise exception 'Se requiere un usuario autenticado para numerar';
  end if;
  if p_tipo not in ('COT', 'FT', 'BR', 'AE', 'INF') then
    raise exception 'Tipo de numeración desconocido: %', p_tipo;
  end if;

  insert into public.contadores as c (owner_id, tipo, anio, ultimo)
  values (p_owner, p_tipo, p_anio, 1)
  on conflict (owner_id, tipo, anio)
  do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_ultimo;

  return format('%s-%s-%s', p_tipo, p_anio, lpad(v_ultimo::text, 3, '0'));
end;
$$;
