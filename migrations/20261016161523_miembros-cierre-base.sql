-- =====================================================================
-- Fase 13 · Modelo de equipo interno y cierre de la base
-- Auditoría: SEG-01, SEG-02, SEG-04, SEG-06, SEG-07, SEG-11, ARQ-01, DAT-01.
--
-- Hasta aquí "propietario" era "quien tenga un perfil_marca" y el dueño público
-- de la landing era "el perfil más antiguo": cualquier usuario autenticado podía
-- crearse un perfil (con created_at antiguo) o empresas propias. Ahora:
--   - public.miembros guarda quién es el propietario (y, desde la Fase 14, los colaboradores);
--   - toda política exige además es_propietario();
--   - created_at / updated_at / owner_id ya no los decide el cliente;
--   - clientes.usuario_id solo lo cambia el propietario y nunca apunta a un miembro;
--   - la landing, los leads y los avisos usan al propietario registrado.
--
-- Compatible con el código publicado: el propietario conserva su perfil_marca, así
-- que el obtenerRol anterior sigue reconociéndolo.
--
-- Las secciones <generado:…> las escribe scripts/generar-cierre-base.mjs (InsForge
-- no admite bloques DO con EXECUTE, así que las 105 políticas van explícitas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Miembros del estudio
-- ---------------------------------------------------------------------
create table public.miembros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('propietario', 'colaborador')),
  nombre text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un solo propietario: es el "dueño público" de la landing y el destino de los leads.
create unique index miembros_un_propietario on public.miembros (rol) where rol = 'propietario';

-- Sin políticas ni privilegios: solo se lee desde funciones security definer.
alter table public.miembros enable row level security;
revoke all on public.miembros from public, anon, authenticated;

-- El propietario actual es el dueño del único perfil de marca (verificado en producción el 16/10/2026).
insert into public.miembros (user_id, rol, nombre)
select p.owner_id, 'propietario', p.responsable
from public.perfil_marca p
order by p.created_at
limit 1
on conflict (user_id) do nothing;

-- true si quien llama es el propietario activo.
create or replace function public.es_propietario()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.miembros m
    where m.user_id = auth.uid() and m.rol = 'propietario' and m.activo
  );
$$;
revoke all on function public.es_propietario() from public, anon;
grant execute on function public.es_propietario() to authenticated;

-- Id del propietario activo, para lo público (landing, leads). Solo lo usan otras funciones.
create or replace function public.propietario_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select m.user_id from public.miembros m where m.rol = 'propietario' and m.activo limit 1;
$$;
revoke all on function public.propietario_id() from public, anon, authenticated;

-- true si quien llama es el propietario y p_uid puede vincularse a una empresa (no es miembro).
-- Para quien no es propietario siempre es false: no revela si un uuid es miembro.
create or replace function public.usuario_vinculable(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select public.es_propietario()
     and not exists (select 1 from public.miembros m where m.user_id = p_uid);
$$;
revoke all on function public.usuario_vinculable(uuid) from public, anon;
grant execute on function public.usuario_vinculable(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Columnas de sistema (DAT-01)
-- Solo se aplica a peticiones de la API (roles authenticated/anon). Las funciones
-- security definer y la CLI corren con otro rol y conservan su comportamiento.
-- ---------------------------------------------------------------------
create or replace function public.columnas_sistema()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_at := now();
    else
      new.created_at := old.created_at;
      new.owner_id := old.owner_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- contadores no tiene created_at/updated_at: solo se protege owner_id.
create or replace function public.owner_inmutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

-- Vincular un usuario a una empresa solo lo hace el propietario, y nunca con un miembro (SEG-02).
create or replace function public.clientes_proteger_usuario()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.usuario_id is not null
     and new.usuario_id is distinct from (case when tg_op = 'UPDATE' then old.usuario_id end)
     and not public.usuario_vinculable(new.usuario_id) then
    raise exception 'No puedes vincular ese usuario a una empresa.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger clientes_proteger_usuario before insert or update of usuario_id on public.clientes
  for each row execute function public.clientes_proteger_usuario();

-- <generado:triggers>
drop trigger if exists perfil_marca_updated_at on public.perfil_marca;
create trigger perfil_marca_sistema before insert or update on public.perfil_marca
  for each row execute function public.columnas_sistema();
drop trigger if exists clientes_updated_at on public.clientes;
create trigger clientes_sistema before insert or update on public.clientes
  for each row execute function public.columnas_sistema();
drop trigger if exists equipos_updated_at on public.equipos;
create trigger equipos_sistema before insert or update on public.equipos
  for each row execute function public.columnas_sistema();
drop trigger if exists servicios_updated_at on public.servicios;
create trigger servicios_sistema before insert or update on public.servicios
  for each row execute function public.columnas_sistema();
create trigger contadores_sistema before update on public.contadores
  for each row execute function public.owner_inmutable();
drop trigger if exists cotizaciones_updated_at on public.cotizaciones;
create trigger cotizaciones_sistema before insert or update on public.cotizaciones
  for each row execute function public.columnas_sistema();
drop trigger if exists cotizacion_items_updated_at on public.cotizacion_items;
create trigger cotizacion_items_sistema before insert or update on public.cotizacion_items
  for each row execute function public.columnas_sistema();
drop trigger if exists fichas_updated_at on public.fichas;
create trigger fichas_sistema before insert or update on public.fichas
  for each row execute function public.columnas_sistema();
drop trigger if exists ficha_diagnosticos_updated_at on public.ficha_diagnosticos;
create trigger ficha_diagnosticos_sistema before insert or update on public.ficha_diagnosticos
  for each row execute function public.columnas_sistema();
drop trigger if exists ficha_trabajos_updated_at on public.ficha_trabajos;
create trigger ficha_trabajos_sistema before insert or update on public.ficha_trabajos
  for each row execute function public.columnas_sistema();
drop trigger if exists ficha_incidencias_updated_at on public.ficha_incidencias;
create trigger ficha_incidencias_sistema before insert or update on public.ficha_incidencias
  for each row execute function public.columnas_sistema();
drop trigger if exists ficha_recomendaciones_updated_at on public.ficha_recomendaciones;
create trigger ficha_recomendaciones_sistema before insert or update on public.ficha_recomendaciones
  for each row execute function public.columnas_sistema();
drop trigger if exists plantillas_checklist_updated_at on public.plantillas_checklist;
create trigger plantillas_checklist_sistema before insert or update on public.plantillas_checklist
  for each row execute function public.columnas_sistema();
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_sistema before insert or update on public.leads
  for each row execute function public.columnas_sistema();
drop trigger if exists enlaces_publicos_updated_at on public.enlaces_publicos;
create trigger enlaces_publicos_sistema before insert or update on public.enlaces_publicos
  for each row execute function public.columnas_sistema();
drop trigger if exists trabajos_updated_at on public.trabajos;
create trigger trabajos_sistema before insert or update on public.trabajos
  for each row execute function public.columnas_sistema();
drop trigger if exists trabajo_etapas_updated_at on public.trabajo_etapas;
create trigger trabajo_etapas_sistema before insert or update on public.trabajo_etapas
  for each row execute function public.columnas_sistema();
drop trigger if exists trabajo_tareas_updated_at on public.trabajo_tareas;
create trigger trabajo_tareas_sistema before insert or update on public.trabajo_tareas
  for each row execute function public.columnas_sistema();
drop trigger if exists trabajo_entregables_updated_at on public.trabajo_entregables;
create trigger trabajo_entregables_sistema before insert or update on public.trabajo_entregables
  for each row execute function public.columnas_sistema();
drop trigger if exists comentarios_updated_at on public.comentarios;
create trigger comentarios_sistema before insert or update on public.comentarios
  for each row execute function public.columnas_sistema();
drop trigger if exists cobros_updated_at on public.cobros;
create trigger cobros_sistema before insert or update on public.cobros
  for each row execute function public.columnas_sistema();
drop trigger if exists briefs_updated_at on public.briefs;
create trigger briefs_sistema before insert or update on public.briefs
  for each row execute function public.columnas_sistema();
drop trigger if exists actas_entrega_updated_at on public.actas_entrega;
create trigger actas_entrega_sistema before insert or update on public.actas_entrega
  for each row execute function public.columnas_sistema();
drop trigger if exists actividades_updated_at on public.actividades;
create trigger actividades_sistema before insert or update on public.actividades
  for each row execute function public.columnas_sistema();
drop trigger if exists informes_updated_at on public.informes;
create trigger informes_sistema before insert or update on public.informes
  for each row execute function public.columnas_sistema();
drop trigger if exists solicitudes_updated_at on public.solicitudes;
create trigger solicitudes_sistema before insert or update on public.solicitudes
  for each row execute function public.columnas_sistema();
drop trigger if exists aceptaciones_updated_at on public.aceptaciones;
create trigger aceptaciones_sistema before insert or update on public.aceptaciones
  for each row execute function public.columnas_sistema();
-- </generado:triggers>

-- ---------------------------------------------------------------------
-- 3. Políticas: además del dueño de la fila, hay que ser el propietario (SEG-01, ARQ-01)
-- aceptaciones queda de solo lectura: es la constancia de una aceptación (SEG-11).
-- ---------------------------------------------------------------------
-- <generado:politicas>
-- perfil_marca
drop policy if exists perfil_marca_select_propio on public.perfil_marca;
create policy perfil_marca_select_propio on public.perfil_marca
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists perfil_marca_insert_propio on public.perfil_marca;
create policy perfil_marca_insert_propio on public.perfil_marca
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists perfil_marca_update_propio on public.perfil_marca;
create policy perfil_marca_update_propio on public.perfil_marca
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists perfil_marca_delete_propio on public.perfil_marca;
create policy perfil_marca_delete_propio on public.perfil_marca
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- clientes
drop policy if exists clientes_select_propio on public.clientes;
create policy clientes_select_propio on public.clientes
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists clientes_insert_propio on public.clientes;
create policy clientes_insert_propio on public.clientes
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists clientes_update_propio on public.clientes;
create policy clientes_update_propio on public.clientes
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists clientes_delete_propio on public.clientes;
create policy clientes_delete_propio on public.clientes
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- equipos
drop policy if exists equipos_select_propio on public.equipos;
create policy equipos_select_propio on public.equipos
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists equipos_insert_propio on public.equipos;
create policy equipos_insert_propio on public.equipos
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists equipos_update_propio on public.equipos;
create policy equipos_update_propio on public.equipos
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists equipos_delete_propio on public.equipos;
create policy equipos_delete_propio on public.equipos
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- servicios
drop policy if exists servicios_select_propio on public.servicios;
create policy servicios_select_propio on public.servicios
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists servicios_insert_propio on public.servicios;
create policy servicios_insert_propio on public.servicios
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists servicios_update_propio on public.servicios;
create policy servicios_update_propio on public.servicios
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists servicios_delete_propio on public.servicios;
create policy servicios_delete_propio on public.servicios
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- contadores
drop policy if exists contadores_select_propio on public.contadores;
create policy contadores_select_propio on public.contadores
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists contadores_insert_propio on public.contadores;
create policy contadores_insert_propio on public.contadores
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists contadores_update_propio on public.contadores;
create policy contadores_update_propio on public.contadores
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists contadores_delete_propio on public.contadores;
create policy contadores_delete_propio on public.contadores
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- cotizaciones
drop policy if exists cotizaciones_select_propio on public.cotizaciones;
create policy cotizaciones_select_propio on public.cotizaciones
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizaciones_insert_propio on public.cotizaciones;
create policy cotizaciones_insert_propio on public.cotizaciones
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizaciones_update_propio on public.cotizaciones;
create policy cotizaciones_update_propio on public.cotizaciones
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizaciones_delete_propio on public.cotizaciones;
create policy cotizaciones_delete_propio on public.cotizaciones
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- cotizacion_items
drop policy if exists cotizacion_items_select_propio on public.cotizacion_items;
create policy cotizacion_items_select_propio on public.cotizacion_items
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizacion_items_insert_propio on public.cotizacion_items;
create policy cotizacion_items_insert_propio on public.cotizacion_items
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizacion_items_update_propio on public.cotizacion_items;
create policy cotizacion_items_update_propio on public.cotizacion_items
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cotizacion_items_delete_propio on public.cotizacion_items;
create policy cotizacion_items_delete_propio on public.cotizacion_items
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- fichas
drop policy if exists fichas_select_propio on public.fichas;
create policy fichas_select_propio on public.fichas
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists fichas_insert_propio on public.fichas;
create policy fichas_insert_propio on public.fichas
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists fichas_update_propio on public.fichas;
create policy fichas_update_propio on public.fichas
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists fichas_delete_propio on public.fichas;
create policy fichas_delete_propio on public.fichas
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- ficha_diagnosticos
drop policy if exists ficha_diagnosticos_select_propio on public.ficha_diagnosticos;
create policy ficha_diagnosticos_select_propio on public.ficha_diagnosticos
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_diagnosticos_insert_propio on public.ficha_diagnosticos;
create policy ficha_diagnosticos_insert_propio on public.ficha_diagnosticos
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_diagnosticos_update_propio on public.ficha_diagnosticos;
create policy ficha_diagnosticos_update_propio on public.ficha_diagnosticos
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_diagnosticos_delete_propio on public.ficha_diagnosticos;
create policy ficha_diagnosticos_delete_propio on public.ficha_diagnosticos
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- ficha_trabajos
drop policy if exists ficha_trabajos_select_propio on public.ficha_trabajos;
create policy ficha_trabajos_select_propio on public.ficha_trabajos
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_trabajos_insert_propio on public.ficha_trabajos;
create policy ficha_trabajos_insert_propio on public.ficha_trabajos
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_trabajos_update_propio on public.ficha_trabajos;
create policy ficha_trabajos_update_propio on public.ficha_trabajos
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_trabajos_delete_propio on public.ficha_trabajos;
create policy ficha_trabajos_delete_propio on public.ficha_trabajos
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- ficha_incidencias
drop policy if exists ficha_incidencias_select_propio on public.ficha_incidencias;
create policy ficha_incidencias_select_propio on public.ficha_incidencias
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_incidencias_insert_propio on public.ficha_incidencias;
create policy ficha_incidencias_insert_propio on public.ficha_incidencias
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_incidencias_update_propio on public.ficha_incidencias;
create policy ficha_incidencias_update_propio on public.ficha_incidencias
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_incidencias_delete_propio on public.ficha_incidencias;
create policy ficha_incidencias_delete_propio on public.ficha_incidencias
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- ficha_recomendaciones
drop policy if exists ficha_recomendaciones_select_propio on public.ficha_recomendaciones;
create policy ficha_recomendaciones_select_propio on public.ficha_recomendaciones
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_recomendaciones_insert_propio on public.ficha_recomendaciones;
create policy ficha_recomendaciones_insert_propio on public.ficha_recomendaciones
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_recomendaciones_update_propio on public.ficha_recomendaciones;
create policy ficha_recomendaciones_update_propio on public.ficha_recomendaciones
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists ficha_recomendaciones_delete_propio on public.ficha_recomendaciones;
create policy ficha_recomendaciones_delete_propio on public.ficha_recomendaciones
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- plantillas_checklist
drop policy if exists plantillas_checklist_select_propio on public.plantillas_checklist;
create policy plantillas_checklist_select_propio on public.plantillas_checklist
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists plantillas_checklist_insert_propio on public.plantillas_checklist;
create policy plantillas_checklist_insert_propio on public.plantillas_checklist
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists plantillas_checklist_update_propio on public.plantillas_checklist;
create policy plantillas_checklist_update_propio on public.plantillas_checklist
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists plantillas_checklist_delete_propio on public.plantillas_checklist;
create policy plantillas_checklist_delete_propio on public.plantillas_checklist
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- leads
drop policy if exists leads_select_propio on public.leads;
create policy leads_select_propio on public.leads
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists leads_insert_propio on public.leads;
create policy leads_insert_propio on public.leads
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists leads_update_propio on public.leads;
create policy leads_update_propio on public.leads
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists leads_delete_propio on public.leads;
create policy leads_delete_propio on public.leads
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- enlaces_publicos
drop policy if exists enlaces_publicos_select_propio on public.enlaces_publicos;
create policy enlaces_publicos_select_propio on public.enlaces_publicos
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists enlaces_publicos_insert_propio on public.enlaces_publicos;
create policy enlaces_publicos_insert_propio on public.enlaces_publicos
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists enlaces_publicos_update_propio on public.enlaces_publicos;
create policy enlaces_publicos_update_propio on public.enlaces_publicos
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists enlaces_publicos_delete_propio on public.enlaces_publicos;
create policy enlaces_publicos_delete_propio on public.enlaces_publicos
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- trabajos
drop policy if exists trabajos_select_propio on public.trabajos;
create policy trabajos_select_propio on public.trabajos
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajos_insert_propio on public.trabajos;
create policy trabajos_insert_propio on public.trabajos
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajos_update_propio on public.trabajos;
create policy trabajos_update_propio on public.trabajos
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajos_delete_propio on public.trabajos;
create policy trabajos_delete_propio on public.trabajos
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- trabajo_etapas
drop policy if exists trabajo_etapas_select_propio on public.trabajo_etapas;
create policy trabajo_etapas_select_propio on public.trabajo_etapas
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_etapas_insert_propio on public.trabajo_etapas;
create policy trabajo_etapas_insert_propio on public.trabajo_etapas
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_etapas_update_propio on public.trabajo_etapas;
create policy trabajo_etapas_update_propio on public.trabajo_etapas
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_etapas_delete_propio on public.trabajo_etapas;
create policy trabajo_etapas_delete_propio on public.trabajo_etapas
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- trabajo_tareas
drop policy if exists trabajo_tareas_select_propio on public.trabajo_tareas;
create policy trabajo_tareas_select_propio on public.trabajo_tareas
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_tareas_insert_propio on public.trabajo_tareas;
create policy trabajo_tareas_insert_propio on public.trabajo_tareas
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_tareas_update_propio on public.trabajo_tareas;
create policy trabajo_tareas_update_propio on public.trabajo_tareas
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_tareas_delete_propio on public.trabajo_tareas;
create policy trabajo_tareas_delete_propio on public.trabajo_tareas
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- trabajo_entregables
drop policy if exists trabajo_entregables_select_propio on public.trabajo_entregables;
create policy trabajo_entregables_select_propio on public.trabajo_entregables
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_entregables_insert_propio on public.trabajo_entregables;
create policy trabajo_entregables_insert_propio on public.trabajo_entregables
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_entregables_update_propio on public.trabajo_entregables;
create policy trabajo_entregables_update_propio on public.trabajo_entregables
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists trabajo_entregables_delete_propio on public.trabajo_entregables;
create policy trabajo_entregables_delete_propio on public.trabajo_entregables
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- comentarios
drop policy if exists comentarios_select_propio on public.comentarios;
create policy comentarios_select_propio on public.comentarios
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists comentarios_insert_propio on public.comentarios;
create policy comentarios_insert_propio on public.comentarios
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()) and es_propietario = true and autor_uid = (select auth.uid()));
drop policy if exists comentarios_update_propio on public.comentarios;
create policy comentarios_update_propio on public.comentarios
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists comentarios_delete_propio on public.comentarios;
create policy comentarios_delete_propio on public.comentarios
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- cobros
drop policy if exists cobros_select_propio on public.cobros;
create policy cobros_select_propio on public.cobros
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cobros_insert_propio on public.cobros;
create policy cobros_insert_propio on public.cobros
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cobros_update_propio on public.cobros;
create policy cobros_update_propio on public.cobros
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists cobros_delete_propio on public.cobros;
create policy cobros_delete_propio on public.cobros
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- briefs
drop policy if exists briefs_select_propio on public.briefs;
create policy briefs_select_propio on public.briefs
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists briefs_insert_propio on public.briefs;
create policy briefs_insert_propio on public.briefs
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists briefs_update_propio on public.briefs;
create policy briefs_update_propio on public.briefs
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists briefs_delete_propio on public.briefs;
create policy briefs_delete_propio on public.briefs
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- actas_entrega
drop policy if exists actas_select_propio on public.actas_entrega;
create policy actas_select_propio on public.actas_entrega
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actas_insert_propio on public.actas_entrega;
create policy actas_insert_propio on public.actas_entrega
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actas_update_propio on public.actas_entrega;
create policy actas_update_propio on public.actas_entrega
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actas_delete_propio on public.actas_entrega;
create policy actas_delete_propio on public.actas_entrega
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- actividades
drop policy if exists actividades_select_propio on public.actividades;
create policy actividades_select_propio on public.actividades
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actividades_insert_propio on public.actividades;
create policy actividades_insert_propio on public.actividades
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actividades_update_propio on public.actividades;
create policy actividades_update_propio on public.actividades
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists actividades_delete_propio on public.actividades;
create policy actividades_delete_propio on public.actividades
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- informes
drop policy if exists informes_select_propio on public.informes;
create policy informes_select_propio on public.informes
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists informes_insert_propio on public.informes;
create policy informes_insert_propio on public.informes
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists informes_update_propio on public.informes;
create policy informes_update_propio on public.informes
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists informes_delete_propio on public.informes;
create policy informes_delete_propio on public.informes
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- solicitudes
drop policy if exists solicitudes_select_propio on public.solicitudes;
create policy solicitudes_select_propio on public.solicitudes
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists solicitudes_update_propio on public.solicitudes;
create policy solicitudes_update_propio on public.solicitudes
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario())) with check (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists solicitudes_delete_propio on public.solicitudes;
create policy solicitudes_delete_propio on public.solicitudes
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));

-- aceptaciones
drop policy if exists aceptaciones_select_propio on public.aceptaciones;
create policy aceptaciones_select_propio on public.aceptaciones
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.es_propietario()));
drop policy if exists aceptaciones_delete_propio on public.aceptaciones;
-- </generado:politicas>

-- ---------------------------------------------------------------------
-- 4. Lo público usa al propietario registrado, no "el perfil más antiguo"
-- ---------------------------------------------------------------------
create or replace function public.landing_datos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with dueno as (
    select p.* from public.perfil_marca p where p.owner_id = public.propietario_id()
  )
  select jsonb_build_object(
    'marca', (
      select jsonb_build_object(
        'nombre_comercial', d.nombre_comercial, 'responsable', d.responsable, 'cargo', d.cargo,
        'ruc', d.ruc, 'telefono', d.telefono, 'correo', d.correo, 'web', d.web, 'direccion', d.direccion
      ) from dueno d
    ),
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion, 'area', s.area,
               'precio_base', s.precio_base, 'unidad', s.unidad
             ) order by s.area, s.orden, s.nombre)
      from public.servicios s
      join dueno d on d.owner_id = s.owner_id
      where s.visible_landing
    ), '[]'::jsonb)
  );
$$;

-- Leads: propietario registrado, tope global (no depende de la IP que manda el llamador) y longitudes (SEG-04).
create or replace function public.crear_lead(
  p_nombre text, p_telefono text, p_correo text, p_servicio text, p_mensaje text,
  p_ip inet default null, p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 then
    raise exception 'Nombre requerido' using errcode = '22023';
  end if;
  if length(p_nombre) > 120 or length(coalesce(p_telefono, '')) > 30 or length(coalesce(p_correo, '')) > 160
     or length(coalesce(p_servicio, '')) > 120 or length(coalesce(p_mensaje, '')) > 3000 then
    raise exception 'Algún dato es demasiado largo.' using errcode = '22001';
  end if;

  -- Tope global: aunque alguien llame la función directamente con la clave anónima y sin IP.
  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiados envíos en este momento. Intenta en una hora.' using errcode = '53400';
  end if;
  if p_ip is not null
     and (select count(*) from public.leads where ip = p_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados envíos desde esta dirección. Intenta en una hora.' using errcode = '53400';
  end if;

  v_owner := public.propietario_id();
  if v_owner is null then
    raise exception 'El formulario no está disponible ahora.' using errcode = '55000';
  end if;

  insert into public.leads (owner_id, nombre, telefono, correo, servicio, mensaje, ip, user_agent)
  values (v_owner, trim(p_nombre), nullif(trim(p_telefono), ''), nullif(trim(p_correo), ''),
          nullif(trim(p_servicio), ''), nullif(trim(p_mensaje), ''), p_ip, left(p_user_agent, 300))
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Accesos de empresa: solo el propietario, y nunca sobre un miembro (SEG-02)
-- ---------------------------------------------------------------------
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
  if not public.es_propietario()
     or exists (select 1 from public.miembros m where m.user_id = p_usuario)
     or not exists (select 1 from public.clientes c where c.usuario_id = p_usuario and c.owner_id = auth.uid()) then
    raise exception 'Ese usuario no pertenece a una de tus empresas' using errcode = '42501';
  end if;
  update auth.users set password = public.crypt(p_password, public.gen_salt('bf', 10)), updated_at = now()
  where id = p_usuario;
end;
$$;

create or replace function public.ws_correo_usuario(p_usuario uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select u.email
  from auth.users u
  where u.id = p_usuario
    and public.es_propietario()
    and not exists (select 1 from public.miembros m where m.user_id = p_usuario)
    and exists (select 1 from public.clientes c where c.usuario_id = p_usuario and c.owner_id = auth.uid());
$$;

-- Las funciones ws_* de las primeras migraciones solo revocaban a public (SEG-07).
-- <generado:revocar-anon>
revoke execute on function public.ws_aceptar_acta(uuid, text, text) from public, anon;
revoke execute on function public.ws_aceptar_cotizacion(uuid, text, text) from public, anon;
revoke execute on function public.ws_acta(uuid) from public, anon;
revoke execute on function public.ws_actividad(uuid) from public, anon;
revoke execute on function public.ws_admin_set_password(uuid, text) from public, anon;
revoke execute on function public.ws_brief(uuid) from public, anon;
revoke execute on function public.ws_calendario(date, date) from public, anon;
revoke execute on function public.ws_comentar(public.entidad_comentario, uuid, text) from public, anon;
revoke execute on function public.ws_comentarios(public.entidad_comentario, uuid) from public, anon;
revoke execute on function public.ws_correo_usuario(uuid) from public, anon;
revoke execute on function public.ws_cotizaciones() from public, anon;
revoke execute on function public.ws_cotizacion(uuid) from public, anon;
revoke execute on function public.ws_documentos() from public, anon;
revoke execute on function public.ws_empresa_id() from public, anon;
revoke execute on function public.ws_equipos() from public, anon;
revoke execute on function public.ws_ficha(uuid) from public, anon;
revoke execute on function public.ws_informes() from public, anon;
revoke execute on function public.ws_informe(uuid) from public, anon;
revoke execute on function public.ws_inicio() from public, anon;
revoke execute on function public.ws_mi_empresa() from public, anon;
revoke execute on function public.ws_modulo_activo(text) from public, anon;
revoke execute on function public.ws_solicitar(text, text, public.area, public.prioridad, date) from public, anon;
revoke execute on function public.ws_solicitudes() from public, anon;
revoke execute on function public.ws_trabajos() from public, anon;
revoke execute on function public.ws_trabajo(uuid) from public, anon;
-- </generado:revocar-anon>

-- ---------------------------------------------------------------------
-- 6. DNI de quien acepta: completo solo para el propietario (SEG-06)
-- El panel lo lee directo de la tabla; workspace y portal pasan por estas funciones.
-- ---------------------------------------------------------------------
create or replace function public.dni_visible(p_dni text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select case
    when p_dni is null or p_dni = '' then null
    when public.es_propietario() then p_dni
    else '****' || right(p_dni, 4)
  end;
$$;
revoke all on function public.dni_visible(text) from public, anon, authenticated;

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
    'aceptacion', (select jsonb_build_object('nombre', a.nombre, 'dni', public.dni_visible(a.dni), 'aceptado_en', a.aceptado_en)
                   from public.aceptaciones a where a.cotizacion_id = z.id order by a.aceptado_en desc limit 1),
    'cobrado', coalesce((select sum(k.monto) from public.cobros k where k.cotizacion_id = z.id), 0),
    'cliente', (select jsonb_build_object('nombre', c.nombre, 'tipo_doc', c.tipo_doc, 'num_doc', c.num_doc, 'contacto', c.contacto, 'direccion', c.direccion)
                from public.clientes c where c.id = z.cliente_id),
    'marca', public.marca_json(z.owner_id)
  )
  from public.cotizaciones z where z.id = p_id;
$$;

create or replace function public.acta_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', a.id, 'numero', a.numero, 'fecha', a.fecha, 'area', a.area, 'titulo', a.titulo, 'resumen', a.resumen,
    'entregables', a.entregables, 'observaciones', a.observaciones,
    'publicada', a.publicada, 'publicada_en', a.publicada_en,
    'aceptacion', case when a.aceptada_en is null then null
                       else jsonb_build_object('nombre', a.aceptada_nombre, 'dni', public.dni_visible(a.aceptada_dni), 'aceptado_en', a.aceptada_en) end,
    'trabajo', (select t.titulo from public.trabajos t where t.id = a.trabajo_id),
    'cliente', public.cliente_json(a.cliente_id),
    'marca', public.marca_json(a.owner_id),
    'token', (select p.token from public.enlaces_publicos p where p.tipo = 'acta' and p.documento_id = a.id and not p.revocado)
  )
  from public.actas_entrega a where a.id = p_id;
$$;
