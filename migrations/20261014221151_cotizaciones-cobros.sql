-- =====================================================================
-- Fase 6 · Cotizaciones y cobros
-- - Cotizaciones con área, vínculo al trabajo que generan y unidad por línea.
-- - Totales calculados en la base (líneas e IGV), nunca en el cliente.
-- - Cobros (pagos parciales) con medio y referencia.
-- - Aceptación (panel, workspace o portal) que crea el trabajo con su alcance.
-- - Workspace: ws_cotizaciones / ws_cotizacion / ws_aceptar_cotizacion.
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.cotizaciones
  add column area public.area not null default 'desarrollo',
  add column trabajo_id uuid references public.trabajos(id) on delete set null,
  add column rechazada_en timestamptz,
  add column motivo_rechazo text;
create index cotizaciones_trabajo_idx on public.cotizaciones (trabajo_id);

alter table public.cotizacion_items
  add column unidad text not null default 'servicio';

-- Quién registró la aceptación; el DNI es opcional cuando la marca el propietario
-- (p. ej. le dijeron "sí" por teléfono).
alter table public.aceptaciones
  alter column dni drop not null,
  add column registrada_por text not null default 'portal' check (registrada_por in ('portal', 'empresa', 'propietario'));

-- ---------- Totales ----------
-- Importe de una línea: cantidad × precio − descuento, redondeado a céntimos y nunca negativo.
create or replace function public.cotizacion_item_importe()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.importe := greatest(round(new.cantidad * new.precio_unitario)::integer - new.descuento, 0);
  return new;
end;
$$;

create trigger cotizacion_items_importe before insert or update on public.cotizacion_items
  for each row execute function public.cotizacion_item_importe();

-- Subtotal, IGV y total desde las líneas. "sumar": el IGV se agrega encima;
-- "incluido": los precios ya traen IGV y se desglosa.
create or replace function public.cotizacion_totales()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_suma integer;
begin
  select coalesce(sum(i.importe), 0)::integer into v_suma
  from public.cotizacion_items i
  where i.cotizacion_id = new.id;

  if new.igv_modo = 'sumar' then
    new.subtotal := v_suma;
    new.igv := round(v_suma::numeric * new.igv_pct / 10000)::integer;
    new.total := new.subtotal + new.igv;
  else
    new.total := v_suma;
    new.subtotal := round(v_suma::numeric * 10000 / (10000 + new.igv_pct))::integer;
    new.igv := new.total - new.subtotal;
  end if;
  return new;
end;
$$;

create trigger cotizaciones_totales before insert or update on public.cotizaciones
  for each row execute function public.cotizacion_totales();

-- Al cambiar las líneas se "toca" la cotización para que su trigger recalcule.
create or replace function public.cotizacion_items_recalcular()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.cotizaciones set updated_at = now() where id = old.cotizacion_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.cotizacion_id is distinct from old.cotizacion_id) then
    update public.cotizaciones set updated_at = now() where id = new.cotizacion_id;
  end if;
  return null;
end;
$$;

create trigger cotizacion_items_recalcular after insert or update or delete on public.cotizacion_items
  for each row execute function public.cotizacion_items_recalcular();

-- ---------- Cobros ----------
create type public.medio_pago as enum ('transferencia', 'yape', 'plin', 'efectivo', 'tarjeta', 'otro');

create table public.cobros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  fecha date not null default (now() at time zone 'America/Lima')::date,
  monto integer not null check (monto > 0), -- céntimos
  moneda public.moneda not null default 'PEN',
  medio public.medio_pago not null default 'transferencia',
  referencia text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cobros_owner_idx on public.cobros (owner_id, fecha desc);
create index cobros_cliente_idx on public.cobros (cliente_id);
create index cobros_cotizacion_idx on public.cobros (cotizacion_id);
create trigger cobros_updated_at before update on public.cobros for each row execute function public.set_updated_at();

alter table public.cobros enable row level security;
revoke all on public.cobros from anon;
grant select, insert, update, delete on public.cobros to authenticated;
create policy cobros_select_propio on public.cobros for select to authenticated using (owner_id = (select auth.uid()));
create policy cobros_insert_propio on public.cobros for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cobros_update_propio on public.cobros for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cobros_delete_propio on public.cobros for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------- Aceptación: núcleo común ----------
-- Registra la aceptación, crea el trabajo (en curso, con una etapa "Alcance" y
-- una tarea por línea) y lo vincula. Solo la llaman las funciones de abajo.
create or replace function public.cotizacion_aceptar_core(
  p_cot uuid,
  p_nombre text,
  p_dni text,
  p_por text,
  p_ip inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_cot public.cotizaciones%rowtype;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_trabajo uuid;
  v_etapa uuid;
begin
  select * into v_cot from public.cotizaciones where id = p_cot for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'aceptada' then
    return jsonb_build_object('ok', true, 'ya_aceptada', true, 'trabajo_id', v_cot.trabajo_id, 'numero', v_cot.numero);
  end if;
  if p_por <> 'propietario' then
    if v_cot.estado <> 'enviada' or v_cot.fecha + v_cot.validez_dias < v_hoy then
      raise exception 'Esta cotización ya no está vigente' using errcode = '22023';
    end if;
    if p_dni is null then
      raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
    end if;
  end if;
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Escribe el nombre de quien acepta' using errcode = '22023';
  end if;
  if p_dni is not null and p_dni !~ '^\d{8}$' then
    raise exception 'El DNI debe tener 8 dígitos' using errcode = '22023';
  end if;
  if v_cot.total <= 0 then
    raise exception 'La cotización no tiene líneas con importe' using errcode = '22023';
  end if;

  insert into public.aceptaciones (owner_id, cotizacion_id, nombre, dni, ip, user_agent, registrada_por)
  values (v_cot.owner_id, v_cot.id, trim(p_nombre), p_dni, p_ip, p_user_agent, p_por);

  v_trabajo := v_cot.trabajo_id;
  if v_trabajo is null then
    insert into public.trabajos (owner_id, area, cliente_id, titulo, descripcion, estado, prioridad, fecha_inicio, monto_estimado, moneda, visible_empresa)
    values (
      v_cot.owner_id, v_cot.area, v_cot.cliente_id,
      coalesce(nullif(trim(v_cot.asunto), ''), 'Cotización ' || v_cot.numero),
      'Creado al aceptarse la cotización ' || v_cot.numero || '.',
      'en_curso', 'media', v_hoy, v_cot.total, v_cot.moneda, true
    )
    returning id into v_trabajo;

    insert into public.trabajo_etapas (owner_id, trabajo_id, titulo, orden)
    values (v_cot.owner_id, v_trabajo, 'Alcance', 1)
    returning id into v_etapa;

    insert into public.trabajo_tareas (owner_id, trabajo_id, etapa_id, titulo, orden)
    select v_cot.owner_id, v_trabajo, v_etapa, left(trim(split_part(i.descripcion, E'\n', 1)), 200),
           row_number() over (order by i.orden, i.created_at)
    from public.cotizacion_items i
    where i.cotizacion_id = v_cot.id and length(trim(split_part(i.descripcion, E'\n', 1))) > 0;
  end if;

  update public.cotizaciones
  set estado = 'aceptada', aceptada_en = now(), trabajo_id = v_trabajo, rechazada_en = null, motivo_rechazo = null
  where id = v_cot.id;

  return jsonb_build_object('ok', true, 'ya_aceptada', false, 'trabajo_id', v_trabajo, 'numero', v_cot.numero);
end;
$$;
revoke all on function public.cotizacion_aceptar_core(uuid, text, text, text, inet, text) from public, anon, authenticated;

-- El propietario marca aceptada (DNI opcional).
create or replace function public.cotizacion_aceptar_panel(p_cot uuid, p_nombre text, p_dni text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not exists (select 1 from public.cotizaciones c where c.id = p_cot and c.owner_id = auth.uid()) then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  return public.cotizacion_aceptar_core(p_cot, p_nombre, nullif(trim(coalesce(p_dni, '')), ''), 'propietario');
end;
$$;
revoke all on function public.cotizacion_aceptar_panel(uuid, text, text) from public, anon;
grant execute on function public.cotizacion_aceptar_panel(uuid, text, text) to authenticated;

-- Portal por token (fase 7): misma lógica, ahora también crea el trabajo.
create or replace function public.aceptar_cotizacion(
  p_token text,
  p_nombre text,
  p_dni text,
  p_ip inet default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
begin
  select * into v_enlace
  from public.enlaces_publicos
  where token = p_token and revocado = false and tipo = 'cotizacion';
  if not found then
    raise exception 'Enlace no válido' using errcode = 'P0002';
  end if;
  return public.cotizacion_aceptar_core(v_enlace.documento_id, p_nombre, p_dni, 'portal', p_ip, p_user_agent);
end;
$$;
revoke all on function public.aceptar_cotizacion(text, text, text, inet, text) from public;
grant execute on function public.aceptar_cotizacion(text, text, text, inet, text) to anon, authenticated;

-- ---------- Workspace ----------
create or replace function public.ws_modulo_activo(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce((select p_clave = any(c.modulos) from public.clientes c where c.usuario_id = auth.uid() and c.activa limit 1), false);
$$;
revoke all on function public.ws_modulo_activo(text) from public, anon;
grant execute on function public.ws_modulo_activo(text) to authenticated;

-- Lista de cotizaciones de la empresa (nunca borradores ni notas internas), cobros y saldo.
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
  cots as (
    select z.id, z.numero, z.fecha, z.fecha + z.validez_dias as vence, z.asunto, z.area, z.moneda, z.total, z.trabajo_id,
           case when z.estado = 'enviada' and z.fecha + z.validez_dias < (select d from hoy) then 'vencida' else z.estado::text end as estado,
           z.aceptada_en
    from public.cotizaciones z, emp
    where z.cliente_id = emp.id and z.estado <> 'borrador'
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
    'total_cobrado', coalesce((select sum(monto) from cob), 0)
  )
  where exists (select 1 from emp);
$$;
revoke all on function public.ws_cotizaciones() from public, anon;
grant execute on function public.ws_cotizaciones() to authenticated;

-- Detalle para ver y descargar el PDF: líneas, datos de la empresa y de la marca.
create or replace function public.ws_cotizacion(p_id uuid)
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
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', a.dni, 'aceptado_en', a.aceptado_en)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id), 0),
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = z.cliente_id),
    'marca', (select jsonb_build_object('nombre_comercial', m.nombre_comercial, 'responsable', m.responsable, 'cargo', m.cargo, 'ruc', m.ruc,
                                        'telefono', m.telefono, 'correo', m.correo, 'web', m.web, 'direccion', m.direccion,
                                        'pago_cuenta', m.pago_cuenta, 'pago_cci', m.pago_cci, 'pago_yape', m.pago_yape, 'pago_plin', m.pago_plin)
              from public.perfil_marca m where m.owner_id = z.owner_id)
  )
  from public.cotizaciones z
  where z.id = p_id
    and z.cliente_id = public.ws_empresa_id()
    and z.estado <> 'borrador'
    and public.ws_modulo_activo('cotizaciones');
$$;
revoke all on function public.ws_cotizacion(uuid) from public, anon;
grant execute on function public.ws_cotizacion(uuid) to authenticated;

-- La empresa acepta con nombre y DNI; se crea el trabajo.
create or replace function public.ws_aceptar_cotizacion(p_id uuid, p_nombre text, p_dni text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.ws_modulo_activo('cotizaciones')
     or not exists (select 1 from public.cotizaciones z where z.id = p_id and z.cliente_id = public.ws_empresa_id() and z.estado <> 'borrador') then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  return public.cotizacion_aceptar_core(p_id, p_nombre, p_dni, 'empresa');
end;
$$;
revoke all on function public.ws_aceptar_cotizacion(uuid, text, text) from public, anon;
grant execute on function public.ws_aceptar_cotizacion(uuid, text, text) to authenticated;

-- ---------- Inicio del panel: ahora con lo que te deben ----------
create or replace function public.panel_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  activos as (
    select t.*,
           c.nombre as empresa,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha) as tareas_hechas,
           (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id) as tareas_total,
           greatest(t.updated_at, coalesce((select max(x.updated_at) from public.trabajo_tareas x where x.trabajo_id = t.id), t.updated_at)) as ultima_actividad
    from public.trabajos t
    left join public.clientes c on c.id = t.cliente_id
    where t.estado in ('propuesta', 'en_curso', 'en_revision')
  ),
  -- Saldo por empresa y moneda: aceptado menos cobrado.
  deudas as (
    select c.id as cliente_id, c.nombre as empresa, x.moneda,
           sum(x.aceptado)::integer as aceptado, sum(x.cobrado)::integer as cobrado,
           (sum(x.aceptado) - sum(x.cobrado))::integer as saldo
    from (
      select z.cliente_id, z.moneda, z.total as aceptado, 0 as cobrado from public.cotizaciones z where z.estado = 'aceptada'
      union all
      select k.cliente_id, k.moneda, 0, k.monto from public.cobros k
    ) x
    join public.clientes c on c.id = x.cliente_id
    group by c.id, c.nombre, x.moneda
  )
  select jsonb_build_object(
    'hoy', (select d from hoy),

    'por_area', jsonb_build_object(
      'diseno', (select count(*) from activos where area = 'diseno'),
      'desarrollo', (select count(*) from activos where area = 'desarrollo'),
      'soporte', (select count(*) from activos where area = 'soporte')
    ),
    'por_estado', jsonb_build_object(
      'propuesta', (select count(*) from activos where estado = 'propuesta'),
      'en_curso', (select count(*) from activos where estado = 'en_curso'),
      'en_revision', (select count(*) from activos where estado = 'en_revision')
    ),

    'entregas_vencidas', (select count(*) from activos, hoy where fecha_compromiso < hoy.d),
    'entregas_semana', (select count(*) from activos, hoy where fecha_compromiso between hoy.d and hoy.d + 7),
    'entregas', coalesce((
      select jsonb_agg(e order by e.fecha_compromiso)
      from (
        select a.id, a.titulo, a.area, a.estado, a.prioridad, a.fecha_compromiso, a.empresa, a.tareas_hechas, a.tareas_total
        from activos a, hoy
        where a.fecha_compromiso is not null and a.fecha_compromiso <= hoy.d + 14
        order by a.fecha_compromiso
        limit 10
      ) e
    ), '[]'::jsonb),

    'tareas_vencidas', (
      select count(*)
      from public.trabajo_tareas x
      join activos a on a.id = x.trabajo_id, hoy
      where not x.hecha and x.fecha_limite < hoy.d
    ),

    'detenidos', coalesce((
      select jsonb_agg(d order by d.ultima_actividad)
      from (
        select a.id, a.titulo, a.area, a.empresa, a.ultima_actividad
        from activos a
        where a.estado = 'en_curso' and a.ultima_actividad < now() - interval '10 days'
        order by a.ultima_actividad
        limit 6
      ) d
    ), '[]'::jsonb),

    'comentarios_sin_leer', (select count(*) from public.comentarios where not es_propietario and not leido),
    'comentarios', coalesce((
      select jsonb_agg(k order by k.created_at desc)
      from (
        select m.id, m.entidad, m.entidad_id, m.texto, m.created_at, c.nombre as empresa,
               case when m.entidad = 'trabajo' then (select t.titulo from public.trabajos t where t.id = m.entidad_id) end as titulo
        from public.comentarios m
        join public.clientes c on c.id = m.cliente_id
        where not m.es_propietario and not m.leido
        order by m.created_at desc
        limit 5
      ) k
    ), '[]'::jsonb),

    'cotizaciones_sin_respuesta', (select count(*) from public.cotizaciones where estado = 'enviada'),
    'cotizaciones_borrador', (select count(*) from public.cotizaciones where estado = 'borrador'),
    'cotizaciones', coalesce((
      select jsonb_agg(q order by q.vence)
      from (
        select z.id, z.numero, z.asunto, z.total, z.moneda, z.fecha, z.fecha + z.validez_dias as vence, c.nombre as empresa
        from public.cotizaciones z
        join public.clientes c on c.id = z.cliente_id
        where z.estado = 'enviada'
        order by z.fecha + z.validez_dias
        limit 6
      ) q
    ), '[]'::jsonb),
    'aceptado_mes', coalesce((
      select sum(total) from public.cotizaciones, hoy
      where estado = 'aceptada' and date_trunc('month', aceptada_en at time zone 'America/Lima') = date_trunc('month', hoy.d::timestamp)
    ), 0),

    'mantenimientos', coalesce((
      select jsonb_agg(f order by f.proximo_mantenimiento)
      from (
        select fi.id, fi.numero, fi.proximo_mantenimiento, c.nombre as empresa, e.modelo, e.serie
        from public.fichas fi
        join public.clientes c on c.id = fi.cliente_id
        left join public.equipos e on e.id = fi.equipo_id, hoy
        where fi.proximo_mantenimiento between hoy.d and hoy.d + 30
        order by fi.proximo_mantenimiento
        limit 6
      ) f
    ), '[]'::jsonb),

    'por_cobrar', coalesce((select sum(d.saldo) from deudas d where d.saldo > 0 and d.moneda = 'PEN'), 0),
    'deudores', coalesce((
      select jsonb_agg(jsonb_build_object('cliente_id', d.cliente_id, 'empresa', d.empresa, 'moneda', d.moneda,
                                          'aceptado', d.aceptado, 'cobrado', d.cobrado, 'saldo', d.saldo) order by d.saldo desc)
      from (select * from deudas where saldo > 0 order by saldo desc limit 6) d
    ), '[]'::jsonb),

    'leads_nuevos', (select count(*) from public.leads where estado = 'nuevo'),
    'empresas', (select count(*) from public.clientes),
    'empresas_con_acceso', (select count(*) from public.clientes where usuario_id is not null)
  );
$$;

revoke all on function public.panel_resumen() from public, anon;
grant execute on function public.panel_resumen() to authenticated;
