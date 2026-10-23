-- La empresa pide una reunión desde su Calendario y el propietario la confirma.
--
-- Una reunión pedida es una fila de `solicitudes` con tipo = 'reunion' (fecha, hora y modalidad que
-- prefiere la empresa). Al confirmarla, el panel crea la actividad `reunion` visible y la enlaza en
-- `actividad_id`; la empresa nunca escribe en `actividades`.
--   ws_pedir_reunion(...)    → crea el pedido (módulo calendario, tope de 5 por día y empresa).
--   ws_reuniones_pedidas()   → los pedidos de su empresa, con la reunión confirmada si la hay.
--   ws_solicitudes()         → ahora solo los pedidos de trabajo (las reuniones tienen su lista).
-- Aditiva: el código publicado sigue funcionando (los pedidos existentes quedan como 'trabajo').

alter table public.solicitudes
  add column tipo text not null default 'trabajo' check (tipo in ('trabajo', 'reunion')),
  add column hora_deseada time,
  add column modalidad text check (modalidad is null or modalidad in ('virtual', 'presencial')),
  add column actividad_id uuid references public.actividades(id) on delete set null,
  add constraint solicitudes_reunion_fecha check (tipo <> 'reunion' or fecha_deseada is not null);

create index solicitudes_actividad_idx on public.solicitudes (actividad_id) where actividad_id is not null;

-- ---------- Workspace: pedir una reunión ----------
create or replace function public.ws_pedir_reunion(p_tema text, p_detalle text, p_fecha date, p_hora time default null, p_modalidad text default 'virtual')
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  if v_empresa is null or not public.ws_modulo_activo('calendario') then
    raise exception 'No tienes acceso al calendario' using errcode = '42501';
  end if;
  if p_tema is null or length(trim(p_tema)) < 3 then
    raise exception 'Cuéntanos de qué quieres hablar' using errcode = '22023';
  end if;
  if length(p_tema) > 200 or length(coalesce(p_detalle, '')) > 4000 then
    raise exception 'El texto es demasiado largo' using errcode = '22023';
  end if;
  if p_fecha is null then
    raise exception 'Elige el día que prefieres' using errcode = '22023';
  end if;
  if p_fecha < v_hoy then
    raise exception 'La fecha no puede ser pasada' using errcode = '22023';
  end if;
  if p_fecha > v_hoy + 365 then
    raise exception 'Elige una fecha dentro del próximo año' using errcode = '22023';
  end if;
  if coalesce(p_modalidad, 'virtual') not in ('virtual', 'presencial') then
    raise exception 'Elige si la reunión es virtual o presencial' using errcode = '22023';
  end if;
  -- Límite simple contra abusos: 5 pedidos de reunión por día y empresa.
  if (select count(*) from public.solicitudes s where s.cliente_id = v_empresa and s.tipo = 'reunion' and s.created_at > now() - interval '1 day') >= 5 then
    raise exception 'Llegaste al límite de pedidos de reunión por hoy. Escríbenos directamente.' using errcode = '22023';
  end if;

  select c.owner_id into v_owner from public.clientes c where c.id = v_empresa;
  insert into public.solicitudes (owner_id, cliente_id, tipo, titulo, descripcion, prioridad, fecha_deseada, hora_deseada, modalidad)
  values (v_owner, v_empresa, 'reunion', trim(p_tema), nullif(trim(coalesce(p_detalle, '')), ''), 'media', p_fecha, p_hora, coalesce(p_modalidad, 'virtual'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.ws_pedir_reunion(text, text, date, time, text) from public, anon;
grant execute on function public.ws_pedir_reunion(text, text, date, time, text) to authenticated;

-- ---------- Workspace: mis reuniones pedidas ----------
-- Abiertas siempre; las resueltas, durante 30 días. La reunión confirmada solo se ve si es visible.
create or replace function public.ws_reuniones_pedidas()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'titulo', s.titulo, 'descripcion', s.descripcion,
           'fecha_deseada', s.fecha_deseada, 'hora_deseada', to_char(s.hora_deseada, 'HH24:MI'), 'modalidad', s.modalidad,
           'estado', s.estado, 'respuesta', s.respuesta, 'created_at', s.created_at,
           'actividad', (select jsonb_build_object('id', a.id, 'fecha', a.fecha, 'hora_inicio', to_char(a.hora_inicio, 'HH24:MI'),
                                                  'hora_fin', to_char(a.hora_fin, 'HH24:MI'), 'lugar', a.lugar)
                         from public.actividades a
                         where a.id = s.actividad_id and a.cliente_id = s.cliente_id and a.visible_empresa)
         ) order by s.created_at desc), '[]'::jsonb)
  from public.solicitudes s
  where s.cliente_id = public.ws_empresa_id()
    and s.tipo = 'reunion'
    and public.ws_modulo_activo('calendario')
    and (s.estado in ('nueva', 'en_revision') or s.updated_at > now() - interval '30 days');
$$;
revoke all on function public.ws_reuniones_pedidas() from public, anon;
grant execute on function public.ws_reuniones_pedidas() to authenticated;

-- ---------- Workspace: solicitudes de trabajo (sin las reuniones) ----------
create or replace function public.ws_solicitudes()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'titulo', s.titulo, 'descripcion', s.descripcion, 'area', s.area, 'prioridad', s.prioridad,
           'fecha_deseada', s.fecha_deseada, 'estado', s.estado, 'respuesta', s.respuesta, 'created_at', s.created_at,
           'trabajo', (select jsonb_build_object('id', t.id, 'titulo', t.titulo) from public.trabajos t where t.id = s.trabajo_id and t.visible_empresa)
         ) order by s.created_at desc), '[]'::jsonb)
  from public.solicitudes s
  where s.cliente_id = public.ws_empresa_id() and s.tipo = 'trabajo' and public.ws_modulo_activo('solicitudes');
$$;
revoke all on function public.ws_solicitudes() from public, anon;
grant execute on function public.ws_solicitudes() to authenticated;
