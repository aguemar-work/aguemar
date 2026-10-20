-- Sprint 1 · Cobro sin perseguir: plazo de pago, vencidos y recordatorios automáticos.
-- - perfil_marca.plazo_pago_dias_default y cotizaciones.plazo_pago_dias / recordar_pago.
-- - deudas_cotizacion(): pendiente, vencimiento y atraso por cotización aceptada. Los cobros
--   ligados pagan su cotización; los sueltos (y lo que sobra de un ligado) pagan primero lo
--   que vence antes (FIFO por empresa y moneda). La suma de pendientes = saldo de la empresa.
-- - panel_resumen() y ws_cotizaciones() suman lo vencido (conservan sus campos anteriores).
-- - recordatorios_cobro: constancia de cada recordatorio (de solo lectura para el propietario).
-- - ajustes_sistema + cobro_recordatorios_tomar / cobro_recordatorios_fallidos: la tarea diaria
--   (Vercel Cron) entra con el cliente anónimo y un secreto; sin clave de servicio.

-- ---------------------------------------------------------------------
-- 1. Plazo de pago
-- ---------------------------------------------------------------------
alter table public.perfil_marca
  add column if not exists plazo_pago_dias_default integer not null default 15
    check (plazo_pago_dias_default between 0 and 120);

alter table public.cotizaciones
  add column if not exists plazo_pago_dias integer check (plazo_pago_dias between 0 and 120),
  add column if not exists recordar_pago boolean not null default true;

-- Lo que ya existe: plazo por defecto y, si ya está aceptada, recordatorios pausados (D3):
-- el propietario los activa al revisar cada saldo.
update public.cotizaciones z
set plazo_pago_dias = coalesce((select p.plazo_pago_dias_default from public.perfil_marca p where p.owner_id = z.owner_id), 15),
    recordar_pago = (z.estado <> 'aceptada')
where z.plazo_pago_dias is null;

alter table public.cotizaciones alter column plazo_pago_dias set not null;

-- Una cotización nueva sin plazo toma el de Mi marca.
create or replace function public.cotizacion_plazo_pago()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.plazo_pago_dias is null then
    new.plazo_pago_dias := coalesce(
      (select p.plazo_pago_dias_default from public.perfil_marca p where p.owner_id = new.owner_id), 15);
  end if;
  return new;
end;
$$;
drop trigger if exists cotizaciones_plazo_pago on public.cotizaciones;
create trigger cotizaciones_plazo_pago before insert on public.cotizaciones
  for each row execute function public.cotizacion_plazo_pago();

-- ---------------------------------------------------------------------
-- 2. Deuda por cotización
-- security invoker: con la sesión del propietario respeta la RLS (la empresa y el colaborador
-- no leen cotizaciones ni cobros, así que no ven nada). Las funciones ws_* y la tarea diaria
-- la llaman desde security definer y filtran por empresa.
-- ---------------------------------------------------------------------
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
           coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id and k.moneda = z.moneda), 0) as ligado
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
revoke all on function public.deudas_cotizacion(uuid) from public, anon;
grant execute on function public.deudas_cotizacion(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. panel_resumen: + vencido por empresa (deudores) y total vencido
-- ---------------------------------------------------------------------
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

revoke all on function public.panel_resumen() from public, anon;
grant execute on function public.panel_resumen() to authenticated;

-- ---------------------------------------------------------------------
-- 4. ws_cotizaciones: + fecha de pago, pendiente y atraso por cotización aceptada
-- ---------------------------------------------------------------------
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
    'total_vencido', coalesce((select sum(pendiente) from deuda where dias_atraso > 0 and moneda = 'PEN'), 0),
    'proximo_pago', (
      select jsonb_build_object('vence_pago', d.vence_pago, 'pendiente', d.pendiente, 'moneda', d.moneda)
      from deuda d where d.pendiente > 0 order by d.vence_pago limit 1
    )
  )
  where exists (select 1 from emp);
$$;
revoke all on function public.ws_cotizaciones() from public, anon;
grant execute on function public.ws_cotizaciones() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Constancia de recordatorios
-- ---------------------------------------------------------------------
create table if not exists public.recordatorios_cobro (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  tipo text not null check (tipo in ('previo', 'atraso_1', 'atraso_7')),
  vence_pago date not null,
  pendiente integer not null check (pendiente > 0), -- céntimos, al momento del envío
  moneda public.moneda not null,
  correo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Uno por tipo y vencimiento: si cambia el plazo, el nuevo vencimiento vuelve a avisar.
  unique (cotizacion_id, tipo, vence_pago)
);
create index if not exists recordatorios_cobro_owner_idx on public.recordatorios_cobro (owner_id, created_at desc);
create index if not exists recordatorios_cobro_cliente_idx on public.recordatorios_cobro (cliente_id);

drop trigger if exists recordatorios_cobro_sistema on public.recordatorios_cobro;
create trigger recordatorios_cobro_sistema before insert or update on public.recordatorios_cobro
  for each row execute function public.columnas_sistema();

-- De solo lectura para el propietario: solo la escribe la tarea diaria (security definer).
alter table public.recordatorios_cobro enable row level security;
revoke all on public.recordatorios_cobro from anon, authenticated;
grant select on public.recordatorios_cobro to authenticated;
drop policy if exists recordatorios_cobro_select_propio on public.recordatorios_cobro;
create policy recordatorios_cobro_select_propio on public.recordatorios_cobro
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- ---------------------------------------------------------------------
-- 6. Tarea diaria sin clave de servicio
-- ajustes_sistema guarda el hash (sha256, hex) de CRON_SECRET. Es una tabla de sistema:
-- sin owner_id ni permisos de API; solo la leen las funciones de abajo.
--   Cargar: insert into public.ajustes_sistema (clave, valor) values ('cron_hash', '<sha256 hex>')
--           on conflict (clave) do update set valor = excluded.valor, updated_at = now();
-- ---------------------------------------------------------------------
create table if not exists public.ajustes_sistema (
  clave text primary key,
  valor text not null,
  updated_at timestamptz not null default now()
);
alter table public.ajustes_sistema enable row level security;
revoke all on public.ajustes_sistema from public, anon, authenticated;

create or replace function public.cron_autorizado(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(length(p_clave) >= 32, false) and exists (
    select 1 from public.ajustes_sistema a
    where a.clave = 'cron_hash' and a.valor = encode(public.digest(p_clave, 'sha256'), 'hex')
  );
$$;
revoke all on function public.cron_autorizado(text) from public, anon, authenticated;

-- Toma los recordatorios del día: los registra (uno por tipo y vencimiento) y devuelve lo
-- necesario para el correo. Si dos ejecuciones coinciden, la restricción única evita duplicados.
-- Ventanas en vez de días exactos, para que un día sin cron no haga perder el aviso:
--   previo: vence en 0–3 días (y no se aceptó hoy) · atraso_1: 1–6 días · atraso_7: 7 o más.
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
revoke all on function public.cobro_recordatorios_tomar(text) from public, authenticated;
grant execute on function public.cobro_recordatorios_tomar(text) to anon;

-- Los que no se pudieron enviar se borran para que la próxima ejecución los reintente.
-- Solo los registrados hoy, para que no sirva para borrar la constancia de días anteriores.
create or replace function public.cobro_recordatorios_fallidos(p_clave text, p_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_n integer;
begin
  if not public.cron_autorizado(p_clave) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.recordatorios_cobro r
  where r.id = any(coalesce(p_ids, '{}'))
    and r.created_at > now() - interval '1 day';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.cobro_recordatorios_fallidos(text, uuid[]) from public, authenticated;
grant execute on function public.cobro_recordatorios_fallidos(text, uuid[]) to anon;
