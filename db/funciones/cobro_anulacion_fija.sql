-- Vigente según migrations/20261021224712_anulaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cobro_anulacion_fija()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.anulado_en is not null then
      raise exception 'Un cobro anulado no se elimina: queda como registro.' using errcode = '22023';
    end if;
    return old;
  end if;
  if old.anulado_en is not null then
    raise exception 'Un cobro anulado no se modifica.' using errcode = '22023';
  end if;
  if new.anulado_en is not null then
    if new.anulado_motivo is null or length(trim(new.anulado_motivo)) < 3 then
      raise exception 'Escribe el motivo de la anulación.' using errcode = '22023';
    end if;
    if (to_jsonb(new) - 'anulado_en' - 'anulado_motivo' - 'updated_at') is distinct from
       (to_jsonb(old) - 'anulado_en' - 'anulado_motivo' - 'updated_at') then
      raise exception 'Un cobro se anula sin cambiar sus datos.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
