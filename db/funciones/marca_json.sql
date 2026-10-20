-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.marca_json(p_owner uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object('nombre_comercial', m.nombre_comercial, 'responsable', m.responsable, 'cargo', m.cargo, 'ruc', m.ruc,
                            'telefono', m.telefono, 'correo', m.correo, 'web', m.web, 'direccion', m.direccion,
                            'pago_cuenta', m.pago_cuenta, 'pago_cci', m.pago_cci, 'pago_yape', m.pago_yape, 'pago_plin', m.pago_plin)
  from public.perfil_marca m where m.owner_id = p_owner;
$$;
