-- T-28 · ARQ-001, PRO-011 · Una sola fuente para "pendiente de pago".
--
-- El pendiente se calculaba en cuatro sitios con tres reglas: `deudas_cotizacion()` (reparto FIFO de
-- los cobros sueltos), la vista del documento (total menos cobros ligados) y las fichas de empresa y
-- del workspace (total aceptado menos total cobrado, mezclando monedas). Cuando un cobro suelto pagaba
-- una cotización, la ficha decía una cosa y el detalle otra.
--
-- Ahora `cotizacion_json_vivo` expone `pendiente`, `vence_pago` y `atraso_dias` tomados de
-- `deudas_cotizacion()` (null si la cotización no está aceptada), y con ellos el mismo número llega al
-- detalle del panel, a `ws_cotizacion` y al portal `portal_documento`, que ya parten de ese json.
-- `ws_cotizaciones` suma además `total_pendiente` (soles, igual que `total_vencido`).
--
-- Lo que se congela al aceptar (`cotizacion_contenido`) sigue sin incluir estos campos: son
-- información en vivo, no parte del documento aceptado, y así las huellas ya guardadas no cambian.

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
    'enviada_en', z.enviada_en, 'aceptada_en', z.aceptada_en, 'trabajo_id', z.trabajo_id,
    'items', coalesce((select jsonb_agg(jsonb_build_object('descripcion', i.descripcion, 'unidad', i.unidad, 'cantidad', i.cantidad,
                                                           'precio_unitario', i.precio_unitario, 'descuento', i.descuento, 'importe', i.importe)
                                        order by i.orden, i.created_at)
                       from public.cotizacion_items i where i.cotizacion_id = z.id), '[]'::jsonb),
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id), 0),
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

create or replace function public.cotizacion_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         - array['id', 'estado', 'enviada_en', 'aceptada_en', 'trabajo_id', 'aceptacion', 'cobrado',
                 'pendiente', 'vence_pago', 'atraso_dias'];
$$;

create or replace function public.ws_cotizaciones()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with
  emp as (select public.ws_empresa_id() as id where public.ws_modulo_activo('cotizaciones')),
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  deuda as (select v.* from emp, public.deudas_cotizacion(emp.id) v),
  cots as (
    select z.id, z.numero, z.fecha, z.fecha + z.validez_dias as vence, z.asunto, z.area, z.moneda, z.total, z.trabajo_id,
           case when z.estado = 'enviada' and z.fecha + z.validez_dias < (select d from hoy) then 'vencida' else z.estado::text end as estado,
           z.aceptada_en,
           v.vence_pago, v.pendiente, v.dias_atraso
    from public.cotizaciones z
    join emp on z.cliente_id = emp.id
    left join deuda v on v.cotizacion_id = z.id
    where z.estado <> 'borrador'
  ),
  cob as (
    select k.id, k.fecha, k.monto, k.moneda, k.medio, k.referencia, k.cotizacion_id,
           (select z.numero from public.cotizaciones z where z.id = k.cotizacion_id) as cotizacion_numero
    from public.cobros k, emp
    where k.cliente_id = emp.id
  )
  select jsonb_build_object(
    'cotizaciones', coalesce((select jsonb_agg(to_jsonb(c) order by c.fecha desc, c.numero desc) from cots c), '[]'::jsonb),
    'cobros', coalesce((select jsonb_agg(to_jsonb(k) order by k.fecha desc) from cob k), '[]'::jsonb),
    'total_aceptado', coalesce((select sum(total) from cots where estado = 'aceptada'), 0),
    'total_cobrado', coalesce((select sum(monto) from cob), 0),
    'total_pendiente', coalesce((select sum(pendiente) from deuda where moneda = 'PEN'), 0),
    'total_vencido', coalesce((select sum(pendiente) from deuda where dias_atraso > 0 and moneda = 'PEN'), 0),
    'proximo_pago', (
      select jsonb_build_object('vence_pago', d.vence_pago, 'pendiente', d.pendiente, 'moneda', d.moneda)
      from deuda d where d.pendiente > 0 order by d.vence_pago limit 1
    )
  )
  where exists (select 1 from emp);
$$;
