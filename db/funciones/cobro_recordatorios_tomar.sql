-- Vigente según migrations/20261019223047_cobros-vencimientos.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cobro_recordatorios_tomar(p_clave text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_res jsonb;
begin
  if not public.cron_autorizado(p_clave) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  with
  candidatos as (
    select v.*, c.nombre as empresa, c.contacto, c.slug, c.modulos,
           coalesce(nullif(trim(c.correo), ''), (select u.email from auth.users u where u.id = c.usuario_id)) as correo,
           (c.usuario_id is not null and c.slug is not null) as con_acceso,
           case
             when v.dias_atraso >= 7 then 'atraso_7'
             when v.dias_atraso >= 1 then 'atraso_1'
             when v.vence_pago - v_hoy between 0 and 3 and v.aceptada_el < v_hoy then 'previo'
           end as tipo
    from public.deudas_cotizacion() v
    join public.clientes c on c.id = v.cliente_id
    where v.pendiente > 0 and v.recordar_pago and c.activa and c.avisos_correo
  ),
  nuevos as (
    insert into public.recordatorios_cobro (owner_id, cliente_id, cotizacion_id, tipo, vence_pago, pendiente, moneda, correo)
    select k.owner_id, k.cliente_id, k.cotizacion_id, k.tipo, k.vence_pago, k.pendiente, k.moneda, k.correo
    from candidatos k
    where k.tipo is not null and k.correo is not null
    on conflict (cotizacion_id, tipo, vence_pago) do nothing
    returning id, cotizacion_id, tipo
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'tipo', n.tipo,
    'cotizacion_id', k.cotizacion_id,
    'numero', z.numero,
    'asunto', z.asunto,
    'moneda', k.moneda,
    'total', k.total,
    'pendiente', k.pendiente,
    'vence_pago', k.vence_pago,
    'dias_atraso', k.dias_atraso,
    'empresa', jsonb_build_object('nombre', k.empresa, 'contacto', k.contacto, 'correo', k.correo, 'slug', k.slug,
                                  'modulos', to_jsonb(k.modulos), 'con_acceso', k.con_acceso),
    'enlace', (select e.token from public.enlaces_publicos e
               where e.tipo = 'cotizacion' and e.documento_id = k.cotizacion_id and not e.revocado limit 1),
    'marca', (select jsonb_build_object('nombre_comercial', p.nombre_comercial, 'responsable', p.responsable,
                                        'correo', p.correo, 'telefono', p.telefono,
                                        'pago_cuenta', p.pago_cuenta, 'pago_cci', p.pago_cci,
                                        'pago_yape', p.pago_yape, 'pago_plin', p.pago_plin)
              from public.perfil_marca p where p.owner_id = k.owner_id)
  )), '[]'::jsonb)
  into v_res
  from nuevos n
  join candidatos k on k.cotizacion_id = n.cotizacion_id and k.tipo = n.tipo
  join public.cotizaciones z on z.id = n.cotizacion_id;

  return v_res;
end;
$$;
