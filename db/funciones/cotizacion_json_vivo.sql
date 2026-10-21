-- Vigente según migrations/20261021225400_aceptacion-origen.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

create or replace function public.cotizacion_json_vivo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', z.id, 'numero', z.numero, 'fecha', z.fecha, 'validez_dias', z.validez_dias, 'vence', z.fecha + z.validez_dias,
    'asunto', z.asunto, 'area', z.area, 'moneda', z.moneda, 'igv_pct', z.igv_pct, 'igv_modo', z.igv_modo,
    'subtotal', z.subtotal, 'igv', z.igv, 'total', z.total, 'condiciones', z.condiciones,
    'estado', case when z.estado = 'enviada' and z.fecha + z.validez_dias < (now() at time zone 'America/Lima')::date then 'vencida' else z.estado::text end,
    'enviada_en', z.enviada_en, 'aceptada_en', z.aceptada_en, 'trabajo_id', z.trabajo_id, 'anulada_en', z.anulada_en,
    'version', z.version,
    'huella', coalesce((select a.huella from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1), z.enviada_huella),
    'items', coalesce((select jsonb_agg(jsonb_build_object('descripcion', i.descripcion, 'unidad', i.unidad, 'cantidad', i.cantidad,
                                                           'precio_unitario', i.precio_unitario, 'descuento', i.descuento, 'importe', i.importe)
                                        order by i.orden, i.created_at)
                       from public.cotizacion_items i where i.cotizacion_id = z.id), '[]'::jsonb),
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en, 'por', a.registrada_por)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id and k.anulado_en is null), 0),
    'pendiente', d.pendiente, 'vence_pago', d.vence_pago, 'atraso_dias', d.dias_atraso,
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = z.cliente_id),
    'marca', public.marca_json(z.owner_id)
  )
  from public.cotizaciones z
  left join lateral (
    select v.pendiente, v.vence_pago, v.dias_atraso
    from public.deudas_cotizacion(z.cliente_id) v
    where v.cotizacion_id = z.id
  ) d on true
  where z.id = p_id;
$$;
