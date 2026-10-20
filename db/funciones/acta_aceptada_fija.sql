-- Vigente según migrations/20261020171216_inmutabilidad-aceptados.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.acta_aceptada_fija()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  -- Dentro de acta_aceptar_core (security definer) current_user es el dueño de la función;
  -- desde la API es anon o authenticated.
  v_aceptando boolean := current_user not in ('anon', 'authenticated');
begin
  if tg_op = 'DELETE' then
    if old.aceptada_en is not null then
      raise exception 'Un acta aceptada no se elimina: es el registro de la conformidad.' using errcode = '22023';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if (new.aceptada_en is not null or new.aceptada_documento is not null) and not v_aceptando then
      raise exception 'Un acta se acepta registrando quién la recibe, no creándola aceptada.' using errcode = '22023';
    end if;
    return new;
  end if;

  if (new.aceptada_en, new.aceptada_nombre, new.aceptada_dni, new.aceptada_por, new.aceptada_documento, new.aceptada_huella)
     is distinct from
     (old.aceptada_en, old.aceptada_nombre, old.aceptada_dni, old.aceptada_por, old.aceptada_documento, old.aceptada_huella)
     and not v_aceptando then
    raise exception 'La aceptación de un acta solo se registra al aceptarla.' using errcode = '22023';
  end if;
  if old.aceptada_en is not null
     and (new.numero, new.cliente_id, new.area, new.fecha, new.titulo, new.resumen, new.entregables, new.observaciones)
         is distinct from
         (old.numero, old.cliente_id, old.area, old.fecha, old.titulo, old.resumen, old.entregables, old.observaciones) then
    raise exception 'Un acta aceptada no se edita: es el registro de la conformidad.' using errcode = '22023';
  end if;
  return new;
end;
$$;
