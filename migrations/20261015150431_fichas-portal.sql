-- =====================================================================
-- Fase 7a · Fichas técnicas, portal por token y workspace (Documentos, Equipos)
-- - fichas: publicada (la ve la empresa y el portal), vínculo a trabajo y JSON de diagnóstico importado.
-- - ficha_json / cotizacion_json: proyección completa y segura de un documento (para PDF y portal).
-- - obtener_enlace: crea o renueva el token público de un documento del propietario.
-- - portal_documento: lee por token (ficha publicada o cotización enviada) y cuenta la vista.
-- - ws_documentos / ws_ficha / ws_equipos: módulos del workspace.
-- =====================================================================

alter table public.fichas
  add column publicada boolean not null default false,
  add column publicada_en timestamptz,
  add column trabajo_id uuid references public.trabajos(id) on delete set null,
  add column diagnostico_origen jsonb; -- JSON tal como lo generó diagnostico-agueMar.ps1
create index fichas_trabajo_idx on public.fichas (trabajo_id);

-- Numeración: también BR, AE e INF (briefs, actas, informes).
create or replace function public.siguiente_numero(p_tipo text, p_anio integer, p_owner uuid default auth.uid())
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_ultimo integer;
begin
  if p_owner is null then
    raise exception 'Se requiere un usuario autenticado para numerar';
  end if;
  if p_tipo not in ('COT', 'FT', 'BR', 'AE', 'INF') then
    raise exception 'Tipo de numeración desconocido: %', p_tipo;
  end if;

  insert into public.contadores as c (owner_id, tipo, anio, ultimo)
  values (p_owner, p_tipo, p_anio, 1)
  on conflict (owner_id, tipo, anio)
  do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_ultimo;

  return format('%s-%s-%s', p_tipo, p_anio, lpad(v_ultimo::text, 3, '0'));
end;
$$;

-- ---------- Proyecciones completas (uso interno de funciones security definer) ----------
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
revoke all on function public.marca_json(uuid) from public, anon, authenticated;

create or replace function public.ficha_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', f.id, 'numero', f.numero, 'fecha', f.fecha, 'tipo_servicio', f.tipo_servicio, 'modalidad', f.modalidad,
    'titular', f.titular, 'resumen', f.resumen, 'estado_final', f.estado_final, 'indicadores', f.indicadores,
    'proximo_mantenimiento', f.proximo_mantenimiento, 'publicada', f.publicada, 'publicada_en', f.publicada_en,
    'equipo', (select jsonb_build_object('marca', e.marca, 'modelo', e.modelo, 'serie', e.serie, 'sistema_operativo', e.sistema_operativo,
                                         'procesador', e.procesador, 'ram', e.ram, 'almacenamiento', e.almacenamiento, 'grafica', e.grafica,
                                         'bateria', e.bateria, 'bios', e.bios)
               from public.equipos e where e.id = f.equipo_id),
    'diagnosticos', coalesce((select jsonb_agg(jsonb_build_object('elemento', d.elemento, 'resultado', d.resultado, 'estado', d.estado) order by d.orden, d.created_at)
                              from public.ficha_diagnosticos d where d.ficha_id = f.id), '[]'::jsonb),
    'trabajos', coalesce((select jsonb_agg(jsonb_build_object('titulo', t.titulo, 'detalle', t.detalle, 'hecho', t.hecho) order by t.orden, t.created_at)
                          from public.ficha_trabajos t where t.ficha_id = f.id), '[]'::jsonb),
    'incidencias', coalesce((select jsonb_agg(jsonb_build_object('titulo', i.titulo, 'causa', i.causa, 'solucion', i.solucion, 'estado', i.estado) order by i.orden, i.created_at)
                             from public.ficha_incidencias i where i.ficha_id = f.id), '[]'::jsonb),
    'recomendaciones', coalesce((select jsonb_agg(r.texto order by r.orden, r.created_at)
                                 from public.ficha_recomendaciones r where r.ficha_id = f.id), '[]'::jsonb),
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = f.cliente_id),
    'marca', public.marca_json(f.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'ficha' and p.documento_id = f.id and not p.revocado)
  )
  from public.fichas f where f.id = p_id;
$$;
revoke all on function public.ficha_json(uuid) from public, anon, authenticated;

create or replace function public.cotizacion_json(p_id uuid)
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
    'marca', public.marca_json(z.owner_id)
  )
  from public.cotizaciones z where z.id = p_id;
$$;
revoke all on function public.cotizacion_json(uuid) from public, anon, authenticated;

-- El workspace usa la misma proyección (antes la armaba aquí mismo).
create or replace function public.ws_cotizacion(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.cotizacion_json(z.id)
  from public.cotizaciones z
  where z.id = p_id
    and z.cliente_id = public.ws_empresa_id()
    and z.estado <> 'borrador'
    and public.ws_modulo_activo('cotizaciones');
$$;

-- El propietario lee su ficha completa con la misma forma (PDF del panel).
create or replace function public.ficha_panel(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.ficha_json(f.id) from public.fichas f where f.id = p_id and f.owner_id = auth.uid();
$$;
revoke all on function public.ficha_panel(uuid) from public, anon;
grant execute on function public.ficha_panel(uuid) to authenticated;

-- ---------- Enlace público ----------
-- Crea el enlace de un documento propio o lo reactiva; con p_renovar cambia el token (el anterior deja de servir).
create or replace function public.obtener_enlace(p_tipo public.tipo_documento, p_id uuid, p_renovar boolean default false)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token text;
begin
  if p_tipo = 'cotizacion' and not exists (select 1 from public.cotizaciones where id = p_id and owner_id = auth.uid()) then
    raise exception 'Documento no encontrado' using errcode = 'P0002';
  end if;
  if p_tipo = 'ficha' and not exists (select 1 from public.fichas where id = p_id and owner_id = auth.uid()) then
    raise exception 'Documento no encontrado' using errcode = 'P0002';
  end if;

  insert into public.enlaces_publicos as e (owner_id, tipo, documento_id)
  values (auth.uid(), p_tipo, p_id)
  on conflict (tipo, documento_id) do update
    set revocado = false,
        token = case when p_renovar then public.generar_token() else e.token end
  returning e.token into v_token;
  return v_token;
end;
$$;
revoke all on function public.obtener_enlace(public.tipo_documento, uuid, boolean) from public, anon;
grant execute on function public.obtener_enlace(public.tipo_documento, uuid, boolean) to authenticated;

-- ---------- Portal ----------
-- Solo fichas publicadas y cotizaciones que ya salieron (no borradores). Cuenta la vista.
create or replace function public.portal_documento(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_enlace public.enlaces_publicos%rowtype;
  v_doc jsonb;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;
  select * into v_enlace from public.enlaces_publicos where token = p_token and revocado = false;
  if not found then
    return null;
  end if;

  if v_enlace.tipo = 'ficha' then
    select public.ficha_json(f.id) into v_doc from public.fichas f
    where f.id = v_enlace.documento_id and f.owner_id = v_enlace.owner_id and f.publicada;
  else
    select public.cotizacion_json(z.id) into v_doc from public.cotizaciones z
    where z.id = v_enlace.documento_id and z.owner_id = v_enlace.owner_id and z.estado <> 'borrador';
  end if;
  if v_doc is null then
    return null;
  end if;

  update public.enlaces_publicos set vistas = vistas + 1, ultima_vista = now() where id = v_enlace.id;
  return jsonb_build_object('tipo', v_enlace.tipo, 'documento', v_doc);
end;
$$;
revoke all on function public.portal_documento(text) from public;
grant execute on function public.portal_documento(text) to anon, authenticated;

-- ---------- Workspace ----------
create or replace function public.ws_documentos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'tipo', 'ficha', 'numero', f.numero, 'fecha', f.fecha, 'titulo', f.titular, 'tipo_servicio', f.tipo_servicio,
           'estado_final', f.estado_final,
           'equipo', (select concat_ws(' ', e.marca, e.modelo) || ' · ' || e.serie from public.equipos e where e.id = f.equipo_id)
         ) order by f.fecha desc, f.numero desc), '[]'::jsonb)
  from public.fichas f
  where f.cliente_id = public.ws_empresa_id() and f.publicada and public.ws_modulo_activo('documentos');
$$;
revoke all on function public.ws_documentos() from public, anon;
grant execute on function public.ws_documentos() to authenticated;

-- Ficha completa si es de la empresa, está publicada y la empresa tiene Documentos o Equipos.
create or replace function public.ws_ficha(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.ficha_json(f.id)
  from public.fichas f
  where f.id = p_id and f.cliente_id = public.ws_empresa_id() and f.publicada
    and (public.ws_modulo_activo('documentos') or public.ws_modulo_activo('equipos'));
$$;
revoke all on function public.ws_ficha(uuid) from public, anon;
grant execute on function public.ws_ficha(uuid) to authenticated;

create or replace function public.ws_equipos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'marca', e.marca, 'modelo', e.modelo, 'serie', e.serie, 'sistema_operativo', e.sistema_operativo,
           'procesador', e.procesador, 'ram', e.ram, 'almacenamiento', e.almacenamiento, 'grafica', e.grafica, 'bateria', e.bateria, 'bios', e.bios,
           'fichas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'numero', f.numero, 'fecha', f.fecha, 'tipo_servicio', f.tipo_servicio,
                                                                   'estado_final', f.estado_final, 'proximo_mantenimiento', f.proximo_mantenimiento)
                                                order by f.fecha desc)
                               from public.fichas f where f.equipo_id = e.id and f.publicada), '[]'::jsonb)
         ) order by e.marca, e.modelo), '[]'::jsonb)
  from public.equipos e
  where e.cliente_id = public.ws_empresa_id() and public.ws_modulo_activo('equipos');
$$;
revoke all on function public.ws_equipos() from public, anon;
grant execute on function public.ws_equipos() to authenticated;
