-- =====================================================================
-- Fase 14 · Equipo (colaboradores), invitaciones por enlace y accesos
--
-- - Colaboradores: miembros con rol 'colaborador' y empresas asignadas
--   (miembro_empresas). Ven y trabajan solo lo de esas empresas: tareas,
--   entregables, actividades, equipos, fichas, informes, briefs, actas,
--   comentarios y enlaces. Publican. Nunca cotizaciones, cobros, leads,
--   servicios, marca ni accesos.
-- - trabajos y clientes no se les abren como tabla (la RLS no oculta columnas
--   y ahí están monto_estimado y las notas internas): los leen por las vistas
--   trabajos_equipo y clientes_equipo, con esas columnas en null.
-- - Lo que crea un colaborador queda a nombre del propietario: el trigger
--   <tabla>_dueno corre antes que <tabla>_numero y <tabla>_sistema.
-- - Invitaciones de un solo uso (7 días) para empresas y colaboradores: la
--   persona fija su contraseña; solo se acepta con el correo invitado.
--
-- Compatible con el código publicado: las políticas del propietario no cambian
-- y ws_admin_set_password se mantiene.
-- Las secciones <generado:…> las escribe scripts/generar-equipo.mjs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Empresas asignadas a cada colaborador
-- ---------------------------------------------------------------------
create table public.miembro_empresas (
  user_id uuid not null references public.miembros(user_id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cliente_id)
);
create index miembro_empresas_cliente_idx on public.miembro_empresas (cliente_id);
alter table public.miembro_empresas enable row level security;
revoke all on public.miembro_empresas from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Funciones de rol y de asignación (security definer, sin efectos)
-- ---------------------------------------------------------------------
-- true si quien llama es un colaborador activo.
create or replace function public.es_colaborador()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.miembros m
    where m.user_id = auth.uid() and m.rol = 'colaborador' and m.activo
  );
$$;

-- 'propietario', 'colaborador' o null: una sola llamada para obtenerRol.
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select m.rol from public.miembros m where m.user_id = auth.uid() and m.activo limit 1;
$$;

-- Dueño de los datos del estudio (el propietario) para quien es miembro activo; null para el resto.
create or replace function public.dueno_estudio()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case when public.es_propietario() or public.es_colaborador() then public.propietario_id() end;
$$;

-- true si quien llama es colaborador y la empresa le está asignada.
create or replace function public.cliente_asignado(p_cliente uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p_cliente is not null
     and public.es_colaborador()
     and exists (select 1 from public.miembro_empresas me where me.user_id = auth.uid() and me.cliente_id = p_cliente);
$$;

create or replace function public.trabajo_asignado(p_trabajo uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.trabajos t where t.id = p_trabajo and public.cliente_asignado(t.cliente_id));
$$;

create or replace function public.ficha_asignada(p_ficha uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (select 1 from public.fichas f where f.id = p_ficha and public.cliente_asignado(f.cliente_id));
$$;

-- Documento de una empresa asignada. Las cotizaciones nunca.
create or replace function public.documento_asignado(p_tipo public.tipo_documento, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case p_tipo::text
    when 'ficha' then exists (select 1 from public.fichas d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'brief' then exists (select 1 from public.briefs d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'acta' then exists (select 1 from public.actas_entrega d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    when 'informe' then exists (select 1 from public.informes d where d.id = p_id and public.cliente_asignado(d.cliente_id))
    else false
  end;
$$;

-- Entidad comentable de una empresa asignada (para que un comentario no se cuele en otra empresa).
create or replace function public.entidad_asignada(p_entidad public.entidad_comentario, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case p_entidad::text
    when 'trabajo' then public.trabajo_asignado(p_id)
    when 'actividad' then exists (select 1 from public.actividades a where a.id = p_id and public.cliente_asignado(a.cliente_id))
    when 'informe' then public.documento_asignado('informe', p_id)
    when 'documento' then public.documento_asignado('ficha', p_id) or public.documento_asignado('brief', p_id) or public.documento_asignado('acta', p_id)
    else false
  end;
$$;

revoke all on function public.es_colaborador() from public, anon;
revoke all on function public.mi_rol() from public, anon;
revoke all on function public.dueno_estudio() from public, anon;
revoke all on function public.cliente_asignado(uuid) from public, anon;
revoke all on function public.trabajo_asignado(uuid) from public, anon;
revoke all on function public.ficha_asignada(uuid) from public, anon;
revoke all on function public.documento_asignado(public.tipo_documento, uuid) from public, anon;
revoke all on function public.entidad_asignada(public.entidad_comentario, uuid) from public, anon;
grant execute on function public.es_colaborador() to authenticated;
grant execute on function public.mi_rol() to authenticated;
grant execute on function public.dueno_estudio() to authenticated;
grant execute on function public.cliente_asignado(uuid) to authenticated;
grant execute on function public.trabajo_asignado(uuid) to authenticated;
grant execute on function public.ficha_asignada(uuid) to authenticated;
grant execute on function public.documento_asignado(public.tipo_documento, uuid) to authenticated;
grant execute on function public.entidad_asignada(public.entidad_comentario, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Lo que crea un colaborador es del propietario
-- Corre antes que <tabla>_numero (la numeración usa owner_id) y que <tabla>_sistema.
-- ---------------------------------------------------------------------
create or replace function public.fijar_dueno()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') and public.es_colaborador() then
    new.owner_id := public.dueno_estudio();
  end if;
  return new;
end;
$$;

-- <generado:dueno>
create trigger trabajo_tareas_dueno before insert on public.trabajo_tareas
  for each row execute function public.fijar_dueno();
create trigger trabajo_entregables_dueno before insert on public.trabajo_entregables
  for each row execute function public.fijar_dueno();
create trigger actividades_dueno before insert on public.actividades
  for each row execute function public.fijar_dueno();
create trigger equipos_dueno before insert on public.equipos
  for each row execute function public.fijar_dueno();
create trigger fichas_dueno before insert on public.fichas
  for each row execute function public.fijar_dueno();
create trigger ficha_diagnosticos_dueno before insert on public.ficha_diagnosticos
  for each row execute function public.fijar_dueno();
create trigger ficha_trabajos_dueno before insert on public.ficha_trabajos
  for each row execute function public.fijar_dueno();
create trigger ficha_incidencias_dueno before insert on public.ficha_incidencias
  for each row execute function public.fijar_dueno();
create trigger ficha_recomendaciones_dueno before insert on public.ficha_recomendaciones
  for each row execute function public.fijar_dueno();
create trigger informes_dueno before insert on public.informes
  for each row execute function public.fijar_dueno();
create trigger briefs_dueno before insert on public.briefs
  for each row execute function public.fijar_dueno();
create trigger actas_entrega_dueno before insert on public.actas_entrega
  for each row execute function public.fijar_dueno();
create trigger comentarios_dueno before insert on public.comentarios
  for each row execute function public.fijar_dueno();
create trigger enlaces_publicos_dueno before insert on public.enlaces_publicos
  for each row execute function public.fijar_dueno();
-- </generado:dueno>

-- ---------------------------------------------------------------------
-- 4. Políticas del colaborador (se suman a las del propietario, que no cambian)
-- ---------------------------------------------------------------------
-- <generado:politicas>
-- trabajo_etapas
create policy trabajo_etapas_colaborador_select on public.trabajo_etapas
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));

-- trabajo_tareas
create policy trabajo_tareas_colaborador_select on public.trabajo_tareas
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_tareas_colaborador_insert on public.trabajo_tareas
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_tareas_colaborador_update on public.trabajo_tareas
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id)) with check (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_tareas_colaborador_delete on public.trabajo_tareas
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));

-- trabajo_entregables
create policy trabajo_entregables_colaborador_select on public.trabajo_entregables
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_entregables_colaborador_insert on public.trabajo_entregables
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_entregables_colaborador_update on public.trabajo_entregables
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id)) with check (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));
create policy trabajo_entregables_colaborador_delete on public.trabajo_entregables
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.trabajo_asignado(trabajo_id));

-- actividades
create policy actividades_colaborador_select on public.actividades
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy actividades_colaborador_insert on public.actividades
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy actividades_colaborador_update on public.actividades
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy actividades_colaborador_delete on public.actividades
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));

-- equipos
create policy equipos_colaborador_select on public.equipos
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy equipos_colaborador_insert on public.equipos
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy equipos_colaborador_update on public.equipos
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));

-- fichas
create policy fichas_colaborador_select on public.fichas
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy fichas_colaborador_insert on public.fichas
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy fichas_colaborador_update on public.fichas
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));

-- ficha_diagnosticos
create policy ficha_diagnosticos_colaborador_select on public.ficha_diagnosticos
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_diagnosticos_colaborador_insert on public.ficha_diagnosticos
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_diagnosticos_colaborador_update on public.ficha_diagnosticos
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id)) with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_diagnosticos_colaborador_delete on public.ficha_diagnosticos
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));

-- ficha_trabajos
create policy ficha_trabajos_colaborador_select on public.ficha_trabajos
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_trabajos_colaborador_insert on public.ficha_trabajos
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_trabajos_colaborador_update on public.ficha_trabajos
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id)) with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_trabajos_colaborador_delete on public.ficha_trabajos
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));

-- ficha_incidencias
create policy ficha_incidencias_colaborador_select on public.ficha_incidencias
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_incidencias_colaborador_insert on public.ficha_incidencias
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_incidencias_colaborador_update on public.ficha_incidencias
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id)) with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_incidencias_colaborador_delete on public.ficha_incidencias
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));

-- ficha_recomendaciones
create policy ficha_recomendaciones_colaborador_select on public.ficha_recomendaciones
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_recomendaciones_colaborador_insert on public.ficha_recomendaciones
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_recomendaciones_colaborador_update on public.ficha_recomendaciones
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id)) with check (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));
create policy ficha_recomendaciones_colaborador_delete on public.ficha_recomendaciones
  for delete to authenticated using (owner_id = (select public.dueno_estudio()) and public.ficha_asignada(ficha_id));

-- informes
create policy informes_colaborador_select on public.informes
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy informes_colaborador_insert on public.informes
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy informes_colaborador_update on public.informes
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));

-- briefs
create policy briefs_colaborador_select on public.briefs
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy briefs_colaborador_insert on public.briefs
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy briefs_colaborador_update on public.briefs
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));

-- actas_entrega
create policy actas_entrega_colaborador_select on public.actas_entrega
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id));
create policy actas_entrega_colaborador_insert on public.actas_entrega
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));
create policy actas_entrega_colaborador_update on public.actas_entrega
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and (trabajo_id is null or public.trabajo_asignado(trabajo_id)));

-- comentarios
create policy comentarios_colaborador_select on public.comentarios
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and entidad <> 'cotizacion' and public.entidad_asignada(entidad, entidad_id));
create policy comentarios_colaborador_insert on public.comentarios
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and entidad <> 'cotizacion' and public.entidad_asignada(entidad, entidad_id) and es_propietario = true and autor_uid = (select auth.uid()));
create policy comentarios_colaborador_update on public.comentarios
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and entidad <> 'cotizacion' and public.entidad_asignada(entidad, entidad_id)) with check (owner_id = (select public.dueno_estudio()) and public.cliente_asignado(cliente_id) and entidad <> 'cotizacion' and public.entidad_asignada(entidad, entidad_id));

-- enlaces_publicos
create policy enlaces_publicos_colaborador_select on public.enlaces_publicos
  for select to authenticated using (owner_id = (select public.dueno_estudio()) and public.documento_asignado(tipo, documento_id));
create policy enlaces_publicos_colaborador_insert on public.enlaces_publicos
  for insert to authenticated with check (owner_id = (select public.dueno_estudio()) and public.documento_asignado(tipo, documento_id));
create policy enlaces_publicos_colaborador_update on public.enlaces_publicos
  for update to authenticated using (owner_id = (select public.dueno_estudio()) and public.documento_asignado(tipo, documento_id)) with check (owner_id = (select public.dueno_estudio()) and public.documento_asignado(tipo, documento_id));
-- </generado:politicas>

-- Numeración de los documentos que el colaborador puede crear (FT, BR, AE, INF; nunca COT).
create policy contadores_colaborador_select on public.contadores
  for select to authenticated
  using (owner_id = (select public.dueno_estudio()) and (select public.es_colaborador()) and tipo in ('FT', 'BR', 'AE', 'INF'));
create policy contadores_colaborador_insert on public.contadores
  for insert to authenticated
  with check (owner_id = (select public.dueno_estudio()) and (select public.es_colaborador()) and tipo in ('FT', 'BR', 'AE', 'INF'));
create policy contadores_colaborador_update on public.contadores
  for update to authenticated
  using (owner_id = (select public.dueno_estudio()) and (select public.es_colaborador()) and tipo in ('FT', 'BR', 'AE', 'INF'))
  with check (owner_id = (select public.dueno_estudio()) and (select public.es_colaborador()) and tipo in ('FT', 'BR', 'AE', 'INF'));

-- ---------------------------------------------------------------------
-- 5. Vistas sin dinero ni notas internas para el colaborador
-- Mismas columnas que la tabla (el panel las usa con el mismo código), con
-- monto_estimado, moneda y notas en null. Corren con los privilegios de su
-- dueño, así que filtran ellas mismas por empresa asignada.
-- ---------------------------------------------------------------------
create view public.clientes_equipo as
select c.id, c.owner_id, c.nombre, c.tipo_doc, c.num_doc, c.contacto, c.telefono, c.correo, c.direccion,
       null::text as notas, c.created_at, c.updated_at, c.slug, c.usuario_id, c.modulos, c.activa, c.avisos_correo
from public.clientes c
where public.cliente_asignado(c.id);

create view public.trabajos_equipo as
select t.id, t.owner_id, t.area, t.cliente_id, t.titulo, t.descripcion, t.estado, t.prioridad,
       t.fecha_inicio, t.fecha_compromiso, t.fecha_entrega,
       null::bigint as monto_estimado, null::public.moneda as moneda, null::text as notas,
       t.orden, t.created_at, t.updated_at, t.visible_empresa
from public.trabajos t
where public.cliente_asignado(t.cliente_id);

revoke all on public.clientes_equipo from public, anon;
revoke all on public.trabajos_equipo from public, anon;
grant select on public.clientes_equipo to authenticated;
grant select on public.trabajos_equipo to authenticated;

-- ---------------------------------------------------------------------
-- 6. Enlaces públicos: también para el colaborador (sus documentos, nunca cotizaciones)
-- ---------------------------------------------------------------------
create or replace function public.obtener_enlace(p_tipo public.tipo_documento, p_id uuid, p_renovar boolean default false)
returns text
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_token text;
  v_existe boolean;
  v_dueno uuid := public.dueno_estudio();
begin
  if public.es_propietario() then
    v_existe := case p_tipo::text
      when 'cotizacion' then exists (select 1 from public.cotizaciones where id = p_id and owner_id = auth.uid())
      when 'ficha' then exists (select 1 from public.fichas where id = p_id and owner_id = auth.uid())
      when 'brief' then exists (select 1 from public.briefs where id = p_id and owner_id = auth.uid())
      when 'acta' then exists (select 1 from public.actas_entrega where id = p_id and owner_id = auth.uid())
      when 'informe' then exists (select 1 from public.informes where id = p_id and owner_id = auth.uid())
      else false
    end;
  else
    v_existe := public.documento_asignado(p_tipo, p_id);
  end if;
  if v_dueno is null or not coalesce(v_existe, false) then
    raise exception 'Documento no encontrado' using errcode = 'P0002';
  end if;

  insert into public.enlaces_publicos as e (owner_id, tipo, documento_id)
  values (v_dueno, p_tipo, p_id)
  on conflict (tipo, documento_id) do update
    set revocado = false,
        token = case when p_renovar then public.generar_token() else e.token end
  returning e.token into v_token;
  return v_token;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Avisos a la empresa: datos de contacto para el propietario o el colaborador asignado
-- ---------------------------------------------------------------------
create or replace function public.contacto_aviso_empresa(p_cliente uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'nombre', c.nombre, 'contacto', c.contacto, 'correo', c.correo, 'slug', c.slug, 'modulos', to_jsonb(c.modulos),
    'activa', c.activa, 'avisos_correo', c.avisos_correo,
    'correo_usuario', (select u.email from auth.users u where u.id = c.usuario_id)
  )
  from public.clientes c
  where c.id = p_cliente
    and ((public.es_propietario() and c.owner_id = auth.uid()) or public.cliente_asignado(c.id));
$$;
revoke all on function public.contacto_aviso_empresa(uuid) from public, anon;
grant execute on function public.contacto_aviso_empresa(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Inicio del colaborador: lo que pide atención en sus empresas, en una llamada
-- ---------------------------------------------------------------------
create or replace function public.equipo_resumen()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with hoy as (select (now() at time zone 'America/Lima')::date as d),
  mias as (
    select me.cliente_id from public.miembro_empresas me
    where me.user_id = auth.uid() and public.es_colaborador()
  )
  select jsonb_build_object(
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'slug', c.slug) order by c.nombre)
      from public.clientes c where c.id in (select cliente_id from mias)
    ), '[]'::jsonb),
    'trabajos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'titulo', t.titulo, 'area', t.area, 'estado', t.estado, 'fecha_compromiso', t.fecha_compromiso,
               'empresa', c.nombre,
               'tareas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
               'hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha)
             ) order by t.fecha_compromiso nulls last, t.titulo)
      from public.trabajos t join public.clientes c on c.id = t.cliente_id
      where t.cliente_id in (select cliente_id from mias) and t.estado in ('propuesta', 'en_curso', 'en_revision')
    ), '[]'::jsonb),
    'tareas_vencidas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'fecha_limite', x.fecha_limite,
                                          'trabajo_id', t.id, 'trabajo', t.titulo, 'empresa', c.nombre)
                       order by x.fecha_limite)
      from public.trabajo_tareas x
      join public.trabajos t on t.id = x.trabajo_id
      join public.clientes c on c.id = t.cliente_id
      where t.cliente_id in (select cliente_id from mias) and not x.hecha and x.fecha_limite < (select d from hoy)
        and t.estado not in ('cerrado', 'cancelado', 'entregado')
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'tipo', a.tipo, 'fecha', a.fecha,
                                          'hora_inicio', a.hora_inicio, 'empresa', c.nombre)
                       order by a.fecha, a.hora_inicio nulls first)
      from public.actividades a join public.clientes c on c.id = a.cliente_id
      where a.cliente_id in (select cliente_id from mias)
        and a.fecha between (select d from hoy) and (select d from hoy) + 7 and a.estado <> 'cancelada'
    ), '[]'::jsonb),
    'comentarios', (
      select count(*) from public.comentarios k
      where k.cliente_id in (select cliente_id from mias) and not k.es_propietario and not k.leido and k.entidad <> 'cotizacion'
    )
  );
$$;
revoke all on function public.equipo_resumen() from public, anon;
grant execute on function public.equipo_resumen() to authenticated;

-- ---------------------------------------------------------------------
-- 9. Invitaciones de acceso (empresas y colaboradores)
-- ---------------------------------------------------------------------
create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default public.generar_token(),
  tipo text not null check (tipo in ('empresa', 'colaborador')),
  correo text not null check (correo ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(correo) <= 160),
  nombre text check (length(nombre) <= 120),
  cliente_id uuid references public.clientes(id) on delete cascade,
  empresas uuid[] not null default '{}',
  expira_en timestamptz not null default now() + interval '7 days',
  revocada boolean not null default false,
  usada_en timestamptz,
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((tipo = 'empresa' and cliente_id is not null) or (tipo = 'colaborador' and cliente_id is null))
);
-- Una invitación pendiente por empresa.
create unique index invitaciones_empresa_pendiente on public.invitaciones (cliente_id)
  where tipo = 'empresa' and usada_en is null and not revocada;
create index invitaciones_owner_idx on public.invitaciones (owner_id);

alter table public.invitaciones enable row level security;
revoke all on public.invitaciones from public, anon;
grant select, insert, update, delete on public.invitaciones to authenticated;
create policy invitaciones_select_propio on public.invitaciones
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
create policy invitaciones_insert_propio on public.invitaciones
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
create policy invitaciones_update_propio on public.invitaciones
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()))
  with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
create policy invitaciones_delete_propio on public.invitaciones
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
create trigger invitaciones_sistema before insert or update on public.invitaciones
  for each row execute function public.columnas_sistema();

-- Nuevo enlace (y 7 días más) para una invitación pendiente. Respeta la RLS.
create or replace function public.invitacion_renovar(p_id uuid)
returns text
language sql
set search_path = pg_catalog, public, pg_temp
as $$
  update public.invitaciones
     set token = public.generar_token(), expira_en = now() + interval '7 days', revocada = false
   where id = p_id and usada_en is null
  returning token;
$$;
revoke all on function public.invitacion_renovar(uuid) from public, anon;
grant execute on function public.invitacion_renovar(uuid) to authenticated;

-- Lo que la página /invitacion/[token] muestra antes de aceptar. Sin datos sensibles.
create or replace function public.invitacion_ver(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'tipo', i.tipo,
    'correo', i.correo,
    'nombre', i.nombre,
    'empresa', (select c.nombre from public.clientes c where c.id = i.cliente_id),
    'estudio', (select p.nombre_comercial from public.perfil_marca p where p.owner_id = i.owner_id),
    'estado', case
      when i.usada_en is not null then 'usada'
      when i.revocada then 'revocada'
      when i.expira_en < now() then 'vencida'
      else 'vigente'
    end
  )
  from public.invitaciones i
  where p_token ~ '^[A-Za-z0-9_-]{40,64}$' and i.token = p_token;
$$;
revoke all on function public.invitacion_ver(text) from public;
grant execute on function public.invitacion_ver(text) to anon, authenticated;

-- Acepta la invitación con la sesión de quien la recibió (mismo correo). Devuelve a dónde entra.
create or replace function public.invitacion_aceptar(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_inv public.invitaciones%rowtype;
  v_uid uuid := auth.uid();
  v_correo text;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para aceptar la invitación.' using errcode = '42501';
  end if;
  select * into v_inv from public.invitaciones where token = p_token for update;
  if not found or p_token !~ '^[A-Za-z0-9_-]{40,64}$' then
    raise exception 'La invitación no existe.' using errcode = 'P0002';
  end if;
  if v_inv.usada_en is not null then
    raise exception 'Esta invitación ya se usó.' using errcode = '22023';
  end if;
  if v_inv.revocada or v_inv.expira_en < now() then
    raise exception 'Esta invitación venció. Pide un enlace nuevo.' using errcode = '22023';
  end if;

  select u.email into v_correo from auth.users u where u.id = v_uid;
  if lower(coalesce(v_correo, '')) <> lower(v_inv.correo) then
    raise exception 'Esta invitación es para otro correo.' using errcode = '42501';
  end if;

  if v_inv.tipo = 'empresa' then
    if exists (select 1 from public.miembros m where m.user_id = v_uid) then
      raise exception 'Este correo ya es del equipo del estudio; usa otro para la empresa.' using errcode = '22023';
    end if;
    if exists (select 1 from public.clientes c where c.usuario_id = v_uid and c.id <> v_inv.cliente_id) then
      raise exception 'Este correo ya tiene acceso a otra empresa.' using errcode = '22023';
    end if;
    update public.clientes set usuario_id = v_uid
     where id = v_inv.cliente_id and owner_id = v_inv.owner_id and (usuario_id is null or usuario_id = v_uid)
    returning slug into v_slug;
    if v_slug is null then
      raise exception 'La empresa ya tiene un acceso.' using errcode = '22023';
    end if;
  else
    if exists (select 1 from public.clientes c where c.usuario_id = v_uid) then
      raise exception 'Este correo ya es el acceso de una empresa; usa otro para el equipo.' using errcode = '22023';
    end if;
    if exists (select 1 from public.miembros m where m.user_id = v_uid and m.rol = 'propietario') then
      raise exception 'Ya eres el propietario.' using errcode = '22023';
    end if;
    insert into public.miembros (user_id, rol, nombre) values (v_uid, 'colaborador', v_inv.nombre)
    on conflict (user_id) do update set activo = true, nombre = coalesce(excluded.nombre, public.miembros.nombre);
    insert into public.miembro_empresas (user_id, cliente_id)
    select v_uid, c.id from public.clientes c where c.id = any (v_inv.empresas) and c.owner_id = v_inv.owner_id
    on conflict do nothing;
  end if;

  update public.invitaciones set usada_en = now(), usuario_id = v_uid where id = v_inv.id;
  return jsonb_build_object('tipo', v_inv.tipo, 'slug', v_slug);
end;
$$;
revoke all on function public.invitacion_aceptar(text) from public, anon;
grant execute on function public.invitacion_aceptar(text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Equipo: el propietario lista y actualiza a sus colaboradores
-- ---------------------------------------------------------------------
create or replace function public.equipo_listar()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id, 'nombre', m.nombre, 'correo', u.email, 'activo', m.activo, 'desde', m.created_at,
           'empresas', coalesce((
             select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre) order by c.nombre)
             from public.miembro_empresas me join public.clientes c on c.id = me.cliente_id
             where me.user_id = m.user_id
           ), '[]'::jsonb)
         ) order by m.activo desc, m.nombre), '[]'::jsonb)
  from public.miembros m join auth.users u on u.id = m.user_id
  where m.rol = 'colaborador' and public.es_propietario();
$$;
revoke all on function public.equipo_listar() from public, anon;
grant execute on function public.equipo_listar() to authenticated;

create or replace function public.equipo_actualizar(p_usuario uuid, p_activo boolean, p_empresas uuid[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario puede hacer esto.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.miembros m where m.user_id = p_usuario and m.rol = 'colaborador') then
    raise exception 'Ese usuario no es parte de tu equipo.' using errcode = 'P0002';
  end if;
  update public.miembros set activo = p_activo, updated_at = now() where user_id = p_usuario;
  delete from public.miembro_empresas me
   where me.user_id = p_usuario and not (me.cliente_id = any (coalesce(p_empresas, '{}')));
  insert into public.miembro_empresas (user_id, cliente_id)
  select p_usuario, c.id from public.clientes c where c.id = any (coalesce(p_empresas, '{}')) and c.owner_id = auth.uid()
  on conflict do nothing;
end;
$$;
revoke all on function public.equipo_actualizar(uuid, boolean, uuid[]) from public, anon;
grant execute on function public.equipo_actualizar(uuid, boolean, uuid[]) to authenticated;
