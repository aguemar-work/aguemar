-- Vigente según migrations/20261015173256_informes.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.asignar_numero()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_tipo text;
begin
  if new.numero is not null and new.numero <> '' then
    return new;
  end if;
  v_tipo := case tg_table_name
    when 'cotizaciones' then 'COT'
    when 'fichas' then 'FT'
    when 'briefs' then 'BR'
    when 'actas_entrega' then 'AE'
    when 'informes' then 'INF'
  end;
  new.numero := public.siguiente_numero(v_tipo, extract(year from new.fecha)::integer, new.owner_id);
  return new;
end;
$$;
