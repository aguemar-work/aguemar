-- Vigente según migrations/20261021224131_cotizacion-version.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_versionar()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  -- Sin copia, o cambiándola (congelar o descartar): nada que versionar.
  if old.enviada_documento is null or new.enviada_documento is distinct from old.enviada_documento then
    return new;
  end if;
  if (new.cliente_id, new.fecha, new.validez_dias, new.asunto, new.area, new.moneda,
      new.igv_pct, new.igv_modo, new.subtotal, new.igv, new.total, new.condiciones)
     is distinct from
     (old.cliente_id, old.fecha, old.validez_dias, old.asunto, old.area, old.moneda,
      old.igv_pct, old.igv_modo, old.subtotal, old.igv, old.total, old.condiciones) then
    new.enviada_documento := null;
    new.enviada_huella := null;
    new.version := old.version + 1;
    if old.estado = 'enviada' and new.estado = 'enviada' then
      new.estado := 'borrador';
      new.enviada_en := null;
    end if;
  end if;
  return new;
end;
$$;
