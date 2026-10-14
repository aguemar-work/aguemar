-- =====================================================================
-- agueMar Studio · Empresas y workspaces
-- - clientes: slug, usuario de acceso, módulos activos, activa.
-- - trabajos.visible_empresa.
-- - comentarios (empresa ↔ propietario).
-- - Funciones ws_* (security definer): única vía de acceso del usuario de empresa.
-- =====================================================================

-- ---------- Empresas ----------
alter table public.clientes
  add column slug text,
  add column usuario_id uuid references auth.users(id) on delete set null,
  add column modulos text[] not null default '{}',
  add column activa boolean not null default true;

create unique index clientes_owner_slug_idx on public.clientes (owner_id, slug) where slug is not null;
create unique index clientes_usuario_idx on public.clientes (usuario_id) where usuario_id is not null;

-- Slug inicial para las empresas existentes (sin acentos ni símbolos).
update public.clientes
set slug = trim(both '-' from regexp_replace(lower(translate(nombre, 'áéíóúñÁÉÍÓÚÑ', 'aeiounaeioun')), '[^a-z0-9]+', '-', 'g'))
where slug is null;

-- ---------- Trabajos visibles ----------
alter table public.trabajos add column visible_empresa boolean not null default true;

-- ---------- Comentarios ----------
create type public.entidad_comentario as enum ('trabajo', 'actividad', 'informe', 'documento', 'cotizacion');

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  entidad public.entidad_comentario not null,
  entidad_id uuid not null,
  autor_uid uuid not null references auth.users(id) on delete cascade,
  es_propietario boolean not null default false,
  texto text not null check (length(trim(texto)) > 0 and length(texto) <= 4000),
  leido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comentarios_owner_idx on public.comentarios (owner_id, leido);
create index comentarios_entidad_idx on public.comentarios (cliente_id, entidad, entidad_id, created_at);
create trigger comentarios_updated_at before update on public.comentarios for each row execute function public.set_updated_at();

alter table public.comentarios enable row level security;
revoke all on public.comentarios from anon;
grant select, insert, update, delete on public.comentarios to authenticated;
create policy comentarios_select_propio on public.comentarios for select to authenticated using (owner_id = (select auth.uid()));
create policy comentarios_insert_propio on public.comentarios for insert to authenticated with check (owner_id = (select auth.uid()) and es_propietario = true and autor_uid = (select auth.uid()));
create policy comentarios_update_propio on public.comentarios for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy comentarios_delete_propio on public.comentarios for delete to authenticated using (owner_id = (select auth.uid()));

-- ---------- Helper: empresa del usuario autenticado ----------
create or replace function public.ws_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select c.id from public.clientes c where c.usuario_id = auth.uid() and c.activa limit 1;
$$;
revoke all on function public.ws_empresa_id() from public;
grant execute on function public.ws_empresa_id() to authenticated;

-- ---------- ws_mi_empresa: datos básicos para el layout ----------
create or replace function public.ws_mi_empresa()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'slug', c.slug,
    'modulos', to_jsonb(c.modulos),
    'contacto', c.contacto,
    'marca', (select jsonb_build_object('nombre_comercial', pm.nombre_comercial, 'responsable', pm.responsable, 'telefono', pm.telefono, 'correo', pm.correo)
              from public.perfil_marca pm where pm.owner_id = c.owner_id)
  )
  from public.clientes c
  where c.usuario_id = auth.uid() and c.activa
  limit 1;
$$;
revoke all on function public.ws_mi_empresa() from public;
grant execute on function public.ws_mi_empresa() to authenticated;

-- ---------- ws_trabajos: proyectos visibles con avance ----------
create or replace function public.ws_trabajos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(fila order by
      case t.estado when 'en_curso' then 1 when 'en_revision' then 2 when 'propuesta' then 3 when 'entregado' then 4 else 5 end,
      t.fecha_compromiso nulls last, t.created_at desc), '[]'::jsonb)
  from public.trabajos t
  cross join lateral (
    select jsonb_build_object(
      'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
      'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
      'tareas_hechas', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id and x.hecha),
      'tareas_total', (select count(*) from public.trabajo_tareas x where x.trabajo_id = t.id),
      'comentarios', (select count(*) from public.comentarios k where k.entidad = 'trabajo' and k.entidad_id = t.id)
    ) as fila
  ) f
  where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado';
$$;
revoke all on function public.ws_trabajos() from public;
grant execute on function public.ws_trabajos() to authenticated;

-- ---------- ws_trabajo: detalle con etapas, tareas y entregables ----------
create or replace function public.ws_trabajo(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', t.id, 'area', t.area, 'titulo', t.titulo, 'descripcion', t.descripcion, 'estado', t.estado, 'prioridad', t.prioridad,
    'fecha_inicio', t.fecha_inicio, 'fecha_compromiso', t.fecha_compromiso, 'fecha_entrega', t.fecha_entrega,
    'etapas', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'hecha', e.hecha, 'orden', e.orden) order by e.orden, e.created_at), '[]'::jsonb)
               from public.trabajo_etapas e where e.trabajo_id = t.id),
    'tareas', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'etapa_id', x.etapa_id, 'titulo', x.titulo, 'hecha', x.hecha, 'fecha_limite', x.fecha_limite, 'orden', x.orden) order by x.orden, x.created_at), '[]'::jsonb)
               from public.trabajo_tareas x where x.trabajo_id = t.id),
    'entregables', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nombre', d.nombre, 'tipo', d.tipo, 'url', d.url, 'nota', d.nota) order by d.orden, d.created_at), '[]'::jsonb)
                    from public.trabajo_entregables d where d.trabajo_id = t.id)
  )
  from public.trabajos t
  where t.id = p_id and t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado <> 'cancelado';
$$;
revoke all on function public.ws_trabajo(uuid) from public;
grant execute on function public.ws_trabajo(uuid) to authenticated;

-- ---------- ws_comentarios: hilo de una entidad de mi empresa ----------
create or replace function public.ws_comentarios(p_entidad public.entidad_comentario, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'es_propietario', k.es_propietario, 'texto', k.texto, 'created_at', k.created_at) order by k.created_at), '[]'::jsonb)
  from public.comentarios k
  where k.cliente_id = public.ws_empresa_id() and k.entidad = p_entidad and k.entidad_id = p_id;
$$;
revoke all on function public.ws_comentarios(public.entidad_comentario, uuid) from public;
grant execute on function public.ws_comentarios(public.entidad_comentario, uuid) to authenticated;

-- ---------- ws_comentar: la empresa comenta una entidad suya ----------
create or replace function public.ws_comentar(p_entidad public.entidad_comentario, p_id uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_empresa uuid := public.ws_empresa_id();
  v_owner uuid;
  v_id uuid;
begin
  if v_empresa is null then
    raise exception 'No tienes acceso a un workspace' using errcode = '42501';
  end if;
  if p_texto is null or length(trim(p_texto)) = 0 then
    raise exception 'Escribe un comentario' using errcode = '22023';
  end if;

  -- La entidad debe pertenecer a la empresa y ser visible.
  if p_entidad = 'trabajo' then
    select t.owner_id into v_owner from public.trabajos t
    where t.id = p_id and t.cliente_id = v_empresa and t.visible_empresa;
  else
    v_owner := null; -- otras entidades se habilitan en las fases 5 a 7
  end if;
  if v_owner is null then
    raise exception 'No encontramos ese elemento' using errcode = 'P0002';
  end if;

  insert into public.comentarios (owner_id, cliente_id, entidad, entidad_id, autor_uid, es_propietario, texto, leido)
  values (v_owner, v_empresa, p_entidad, p_id, auth.uid(), false, trim(p_texto), false)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.ws_comentar(public.entidad_comentario, uuid, text) from public;
grant execute on function public.ws_comentar(public.entidad_comentario, uuid, text) to authenticated;

-- ---------- ws_inicio: resumen del workspace ----------
create or replace function public.ws_inicio()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'activos', (select count(*) from public.trabajos t where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('propuesta','en_curso','en_revision')),
    'entregados', (select count(*) from public.trabajos t where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('entregado','cerrado')),
    'proximos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'area', t.area, 'estado', t.estado, 'fecha_compromiso', t.fecha_compromiso) order by t.fecha_compromiso), '[]'::jsonb)
      from (
        select * from public.trabajos t
        where t.cliente_id = public.ws_empresa_id() and t.visible_empresa and t.estado in ('propuesta','en_curso','en_revision') and t.fecha_compromiso is not null
        order by t.fecha_compromiso limit 5
      ) t
    ),
    'respuestas', (
      select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'entidad', k.entidad, 'entidad_id', k.entidad_id, 'texto', k.texto, 'created_at', k.created_at,
                     'titulo', (select t.titulo from public.trabajos t where t.id = k.entidad_id)) order by k.created_at desc), '[]'::jsonb)
      from (
        select * from public.comentarios k
        where k.cliente_id = public.ws_empresa_id() and k.es_propietario
        order by k.created_at desc limit 5
      ) k
    )
  );
$$;
revoke all on function public.ws_inicio() from public;
grant execute on function public.ws_inicio() to authenticated;

-- ---------- ws_admin_set_password: el propietario fija la contraseña del usuario de una empresa ----------
create or replace function public.ws_admin_set_password(p_usuario uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_password is null or length(p_password) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clientes c where c.usuario_id = p_usuario and c.owner_id = auth.uid()) then
    raise exception 'Ese usuario no pertenece a una de tus empresas' using errcode = '42501';
  end if;
  update auth.users set password = public.crypt(p_password, public.gen_salt('bf', 10)), updated_at = now()
  where id = p_usuario;
end;
$$;
revoke all on function public.ws_admin_set_password(uuid, text) from public;
grant execute on function public.ws_admin_set_password(uuid, text) to authenticated;
