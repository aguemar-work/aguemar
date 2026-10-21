-- Vigente según migrations/20261021224131_cotizacion-version.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_items_versionar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  for v_id in
    select distinct x
    from unnest(array[case when tg_op <> 'INSERT' then old.cotizacion_id end,
                      case when tg_op <> 'DELETE' then new.cotizacion_id end]) as x
    where x is not null
  loop
    update public.cotizaciones
    set enviada_documento = null,
        enviada_huella = null,
        version = version + 1,
        estado = case when estado = 'enviada' then 'borrador'::public.estado_cotizacion else estado end,
        enviada_en = case when estado = 'enviada' then null else enviada_en end
    where id = v_id and enviada_documento is not null and estado <> 'aceptada';
  end loop;
  return null;
end;
$$;
