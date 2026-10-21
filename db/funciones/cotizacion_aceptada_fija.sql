-- Vigente según migrations/20261021224712_anulaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_aceptada_fija()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  -- Dentro de cotizacion_aceptar_core (security definer) current_user es el dueño de la función;
  -- desde la API es anon o authenticated.
  v_aceptando boolean := current_user not in ('anon', 'authenticated');
begin
  if tg_op = 'DELETE' then
    if old.estado in ('aceptada', 'anulada') then
      raise exception 'Una cotización aceptada no se elimina: tiene un trabajo y quizá cobros asociados.' using errcode = '22023';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.estado in ('aceptada', 'anulada') and not v_aceptando then
      raise exception 'Una cotización se acepta registrando quién la acepta, no creándola aceptada.' using errcode = '22023';
    end if;
    return new;
  end if;

  if old.estado in ('aceptada', 'anulada') then
    if (new.estado is distinct from old.estado and not (old.estado = 'aceptada' and new.estado = 'anulada' and v_aceptando))
       or (new.numero, new.cliente_id, new.fecha, new.validez_dias, new.asunto, new.area, new.moneda,
           new.igv_pct, new.igv_modo, new.subtotal, new.igv, new.total, new.condiciones, new.aceptada_en)
          is distinct from
          (old.numero, old.cliente_id, old.fecha, old.validez_dias, old.asunto, old.area, old.moneda,
           old.igv_pct, old.igv_modo, old.subtotal, old.igv, old.total, old.condiciones, old.aceptada_en) then
      raise exception 'Una cotización aceptada no se edita: duplícala para hacer otra versión.' using errcode = '22023';
    end if;
  elsif new.estado in ('aceptada', 'anulada') and not v_aceptando then
    raise exception 'Una cotización se acepta registrando quién la acepta, no cambiando su estado.' using errcode = '22023';
  end if;
  return new;
end;
$$;
