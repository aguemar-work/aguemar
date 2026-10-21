-- T-30 · PRO-002 · D4 · Anular una cotización aceptada y sus cobros, sin borrar nada.
--
-- Lo aceptado no cambia (ADR-07), pero un proyecto puede caerse. Antes la única salida era dejar la
-- cotización aceptada para siempre (con su deuda y sus recordatorios) o borrar cobros a mano.
--
--  * `anulada` es un estado nuevo, al que solo se llega desde `aceptada` con `cotizacion_anular` (solo
--    el propietario, con motivo). La aceptación y su copia quedan intactas: es el registro de lo que
--    se aceptó. Una anulada ya no entra en `deudas_cotizacion` ni en los recordatorios, y no se edita
--    ni se borra, igual que una aceptada.
--  * Los cobros no se borran: se anulan (`anulado_en`, `anulado_motivo`) y dejan de contar en saldos,
--    deudas, resumen y workspace. Un cobro anulado no se vuelve a tocar.
--  * Un cobro que no se anuló y estaba ligado a una cotización anulada deja de estar ligado a una
--    deuda viva: entra al reparto como saldo a favor de la empresa (FIFO), igual que un cobro suelto.

alter table public.cotizaciones
  add column if not exists anulada_en timestamptz,
  add column if not exists anulada_motivo text,
  add column if not exists anulada_por uuid references auth.users(id) on delete set null;

alter table public.cobros
  add column if not exists anulado_en timestamptz,
  add column if not exists anulado_motivo text;

-- Un cobro anulado no se cambia ni se borra; anular no toca ningún otro dato y exige motivo.
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
revoke all on function public.cobro_anulacion_fija() from public, anon, authenticated;

drop trigger if exists cobros_anulacion_fija on public.cobros;
create trigger cobros_anulacion_fija before update or delete on public.cobros
  for each row execute function public.cobro_anulacion_fija();

-- Anular la cotización. security definer: la transición aceptada → anulada solo la permite el trigger
-- cuando la hace una función de la base, nunca un UPDATE desde la API.
create or replace function public.cotizacion_anular(p_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_cot public.cotizaciones%rowtype;
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario anula cotizaciones' using errcode = '42501';
  end if;
  select * into v_cot from public.cotizaciones where id = p_id and owner_id = auth.uid() for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'anulada' then
    return jsonb_build_object('ok', true, 'ya_anulada', true, 'numero', v_cot.numero);
  end if;
  if v_cot.estado <> 'aceptada' then
    raise exception 'Solo se anula una cotización aceptada' using errcode = '22023';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Escribe el motivo de la anulación' using errcode = '22023';
  end if;
  update public.cotizaciones
  set estado = 'anulada', anulada_en = now(), anulada_motivo = trim(p_motivo), anulada_por = auth.uid()
  where id = v_cot.id;
  return jsonb_build_object('ok', true, 'ya_anulada', false, 'numero', v_cot.numero);
end;
$$;
revoke all on function public.cotizacion_anular(uuid, text) from public, anon;
grant execute on function public.cotizacion_anular(uuid, text) to authenticated;


-- Una anulada se queda como está; a ella solo se llega desde una aceptada y desde una función de la base.
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


-- Las líneas de una anulada tampoco cambian.
create or replace function public.cotizacion_items_fijos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if exists (select 1 from public.cotizaciones z
             where z.id in (old.cotizacion_id, new.cotizacion_id) and z.estado in ('aceptada', 'anulada')) then
    raise exception 'Una cotización aceptada no se edita: duplícala para hacer otra versión.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


-- Una anulada no se vuelve a aceptar.
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
  v_doc jsonb;
begin
  select * into v_cot from public.cotizaciones where id = p_cot for update;
  if not found then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  if v_cot.estado = 'anulada' then
    raise exception 'Esta cotización fue anulada' using errcode = '22023';
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

  v_doc := public.cotizacion_contenido(v_cot.id);
  if v_cot.enviada_documento is not null then
    if (v_doc - array['marca', 'cliente']) is distinct from (v_cot.enviada_documento - array['marca', 'cliente']) then
      raise exception 'La cotización cambió desde que se envió: pide que te la reenvíen' using errcode = '22023';
    end if;
    v_doc := v_cot.enviada_documento;
  end if;

  insert into public.aceptaciones (owner_id, cotizacion_id, nombre, dni, ip, user_agent, registrada_por, documento, huella)
  values (v_cot.owner_id, v_cot.id, trim(p_nombre), p_dni, p_ip, p_user_agent, p_por, v_doc, public.huella_documento(v_doc));

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


-- Los cobros anulados no cuentan para lo pendiente.
create or replace function public.deudas_cotizacion(p_cliente uuid default null)
returns table (
  cotizacion_id uuid,
  owner_id uuid,
  cliente_id uuid,
  moneda public.moneda,
  total integer,
  pendiente integer,
  aceptada_el date,
  plazo_pago_dias integer,
  vence_pago date,
  dias_atraso integer,
  recordar_pago boolean
)
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  with
  hoy as (select (now() at time zone 'America/Lima')::date as d),
  cots as (
    select z.id, z.owner_id, z.cliente_id, z.moneda, z.total, z.plazo_pago_dias, z.recordar_pago, z.aceptada_en,
           (z.aceptada_en at time zone 'America/Lima')::date as aceptada_el,
           (z.aceptada_en at time zone 'America/Lima')::date + z.plazo_pago_dias as vence_pago,
           coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id and k.moneda = z.moneda and k.anulado_en is null), 0) as ligado
    from public.cotizaciones z
    where z.estado = 'aceptada' and z.aceptada_en is not null
      and (p_cliente is null or z.cliente_id = p_cliente)
  ),
  -- Lo que queda para repartir: cobros sueltos (o ligados a algo que no es una cotización
  -- aceptada de esa moneda) más lo que sobra de los ligados.
  bolsa as (
    select x.cliente_id, x.moneda, sum(x.monto) as monto
    from (
      select k.cliente_id, k.moneda, k.monto
      from public.cobros k
      where (p_cliente is null or k.cliente_id = p_cliente)
        and k.anulado_en is null
        and not exists (select 1 from cots c where c.id = k.cotizacion_id and c.moneda = k.moneda)
      union all
      select c.cliente_id, c.moneda, c.ligado - c.total from cots c where c.ligado > c.total
    ) x
    group by x.cliente_id, x.moneda
  ),
  fifo as (
    select c.*,
           greatest(c.total - c.ligado, 0) as pend0,
           coalesce(sum(greatest(c.total - c.ligado, 0)) over (
             partition by c.cliente_id, c.moneda
             order by c.vence_pago, c.aceptada_en, c.id
             rows between unbounded preceding and 1 preceding), 0) as antes,
           coalesce((select b.monto from bolsa b where b.cliente_id = c.cliente_id and b.moneda = c.moneda), 0) as bolsa
    from cots c
  )
  select f.id, f.owner_id, f.cliente_id, f.moneda, f.total,
         (f.pend0 - least(f.pend0, greatest(f.bolsa - f.antes, 0)))::integer as pendiente,
         f.aceptada_el, f.plazo_pago_dias, f.vence_pago,
         case when f.pend0 - least(f.pend0, greatest(f.bolsa - f.antes, 0)) > 0
              then greatest((select d from hoy) - f.vence_pago, 0) else 0 end as dias_atraso,
         f.recordar_pago
  from fifo f;
$$;


-- El documento sabe cuándo se anuló (no el motivo: es interno) y no cuenta los cobros anulados.
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
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en)
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


-- Lo que se congela no incluye la anulación.
create or replace function public.cotizacion_contenido(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json_vivo(p_id)
         - array['id', 'estado', 'enviada_en', 'aceptada_en', 'trabajo_id', 'aceptacion', 'cobrado',
                 'pendiente', 'vence_pago', 'atraso_dias', 'version', 'huella', 'anulada_en'];
$$;


-- El resumen del panel y el workspace tampoco cuentan los cobros anulados.
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
      select k.cliente_id, k.moneda, 0, k.monto from public.cobros k where k.anulado_en is null
    ) x
    join public.clientes c on c.id = x.cliente_id
    group by c.id, c.nombre, x.moneda
  ),
  -- Lo vencido por empresa y moneda, con el atraso más largo.
  vencidas as (
    select v.cliente_id, v.moneda, sum(v.pendiente)::integer as vencido, max(v.dias_atraso) as dias_atraso
    from public.deudas_cotizacion() v
    where v.pendiente > 0 and v.dias_atraso > 0
    group by v.cliente_id, v.moneda
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
    'por_cobrar_vencido', coalesce((select sum(v.vencido) from vencidas v where v.moneda = 'PEN'), 0),
    'deudores', coalesce((
      select jsonb_agg(jsonb_build_object('cliente_id', d.cliente_id, 'empresa', d.empresa, 'moneda', d.moneda,
                                          'aceptado', d.aceptado, 'cobrado', d.cobrado, 'saldo', d.saldo,
                                          'vencido', coalesce(v.vencido, 0), 'dias_atraso', coalesce(v.dias_atraso, 0))
                       order by coalesce(v.dias_atraso, 0) desc, d.saldo desc)
      from (select * from deudas where saldo > 0 order by saldo desc limit 6) d
      left join vencidas v on v.cliente_id = d.cliente_id and v.moneda = d.moneda
    ), '[]'::jsonb),

    'solicitudes_nuevas', (select count(*) from public.solicitudes where estado = 'nueva'),
    'solicitudes', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'titulo', s.titulo, 'empresa', c.nombre, 'created_at', s.created_at) order by s.created_at desc)
      from (select * from public.solicitudes where estado = 'nueva' order by created_at desc limit 5) s
      join public.clientes c on c.id = s.cliente_id
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'tipo', x.tipo, 'fecha', x.fecha,
                                          'hora_inicio', to_char(x.hora_inicio, 'HH24:MI'), 'empresa', x.empresa) order by x.fecha, x.hora_inicio)
      from (
        select a.id, a.titulo, a.tipo, a.fecha, a.hora_inicio, c.nombre as empresa
        from public.actividades a
        left join public.clientes c on c.id = a.cliente_id, hoy
        where a.estado = 'planificada' and a.fecha between hoy.d and hoy.d + 7
        order by a.fecha, a.hora_inicio
        limit 8
      ) x
    ), '[]'::jsonb),

    'leads_nuevos', (select count(*) from public.leads where estado = 'nuevo'),
    'empresas', (select count(*) from public.clientes),
    'empresas_con_acceso', (select count(*) from public.clientes where usuario_id is not null)
  );
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
    where k.cliente_id = emp.id and k.anulado_en is null
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

