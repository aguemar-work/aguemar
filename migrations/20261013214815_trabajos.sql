-- =====================================================================
-- agueMar Studio · Trabajos (proyectos por área)
-- - Enum area y columna area en servicios (los existentes quedan en soporte).
-- - trabajos, trabajo_etapas, trabajo_tareas, trabajo_entregables con RLS.
-- =====================================================================

create type public.area as enum ('diseno', 'desarrollo', 'soporte');
create type public.estado_trabajo as enum ('propuesta', 'en_curso', 'en_revision', 'entregado', 'cerrado', 'cancelado');
create type public.prioridad as enum ('baja', 'media', 'alta');
create type public.tipo_entregable as enum ('enlace', 'archivo', 'acceso', 'otro');

-- ---------- servicios.area ----------
alter table public.servicios add column area public.area not null default 'soporte';
create index servicios_area_idx on public.servicios (owner_id, area);

-- ---------- trabajos ----------
create table public.trabajos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area public.area not null default 'desarrollo',
  cliente_id uuid references public.clientes(id) on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  descripcion text,
  estado public.estado_trabajo not null default 'propuesta',
  prioridad public.prioridad not null default 'media',
  fecha_inicio date,
  fecha_compromiso date,
  fecha_entrega date,
  monto_estimado integer check (monto_estimado is null or monto_estimado >= 0), -- céntimos
  moneda public.moneda not null default 'PEN',
  notas text,
  orden integer not null default 0, -- posición dentro de su columna del tablero
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trabajos_owner_idx on public.trabajos (owner_id);
create index trabajos_estado_idx on public.trabajos (owner_id, estado, orden);
create index trabajos_cliente_idx on public.trabajos (cliente_id);
create index trabajos_compromiso_idx on public.trabajos (owner_id, fecha_compromiso);

create table public.trabajo_etapas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trabajo_id uuid not null references public.trabajos(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  hecha boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trabajo_etapas_trabajo_idx on public.trabajo_etapas (trabajo_id, orden);

create table public.trabajo_tareas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trabajo_id uuid not null references public.trabajos(id) on delete cascade,
  etapa_id uuid references public.trabajo_etapas(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  hecha boolean not null default false,
  fecha_limite date,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trabajo_tareas_trabajo_idx on public.trabajo_tareas (trabajo_id, orden);
create index trabajo_tareas_etapa_idx on public.trabajo_tareas (etapa_id, orden);

create table public.trabajo_entregables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trabajo_id uuid not null references public.trabajos(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo public.tipo_entregable not null default 'enlace',
  url text,
  nota text,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trabajo_entregables_trabajo_idx on public.trabajo_entregables (trabajo_id, orden);

-- ---------- updated_at ----------
create trigger trabajos_updated_at before update on public.trabajos for each row execute function public.set_updated_at();
create trigger trabajo_etapas_updated_at before update on public.trabajo_etapas for each row execute function public.set_updated_at();
create trigger trabajo_tareas_updated_at before update on public.trabajo_tareas for each row execute function public.set_updated_at();
create trigger trabajo_entregables_updated_at before update on public.trabajo_entregables for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.trabajos enable row level security;
revoke all on public.trabajos from anon;
grant select, insert, update, delete on public.trabajos to authenticated;
create policy trabajos_select_propio on public.trabajos for select to authenticated using (owner_id = (select auth.uid()));
create policy trabajos_insert_propio on public.trabajos for insert to authenticated with check (owner_id = (select auth.uid()));
create policy trabajos_update_propio on public.trabajos for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy trabajos_delete_propio on public.trabajos for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.trabajo_etapas enable row level security;
revoke all on public.trabajo_etapas from anon;
grant select, insert, update, delete on public.trabajo_etapas to authenticated;
create policy trabajo_etapas_select_propio on public.trabajo_etapas for select to authenticated using (owner_id = (select auth.uid()));
create policy trabajo_etapas_insert_propio on public.trabajo_etapas for insert to authenticated with check (owner_id = (select auth.uid()));
create policy trabajo_etapas_update_propio on public.trabajo_etapas for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy trabajo_etapas_delete_propio on public.trabajo_etapas for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.trabajo_tareas enable row level security;
revoke all on public.trabajo_tareas from anon;
grant select, insert, update, delete on public.trabajo_tareas to authenticated;
create policy trabajo_tareas_select_propio on public.trabajo_tareas for select to authenticated using (owner_id = (select auth.uid()));
create policy trabajo_tareas_insert_propio on public.trabajo_tareas for insert to authenticated with check (owner_id = (select auth.uid()));
create policy trabajo_tareas_update_propio on public.trabajo_tareas for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy trabajo_tareas_delete_propio on public.trabajo_tareas for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.trabajo_entregables enable row level security;
revoke all on public.trabajo_entregables from anon;
grant select, insert, update, delete on public.trabajo_entregables to authenticated;
create policy trabajo_entregables_select_propio on public.trabajo_entregables for select to authenticated using (owner_id = (select auth.uid()));
create policy trabajo_entregables_insert_propio on public.trabajo_entregables for insert to authenticated with check (owner_id = (select auth.uid()));
create policy trabajo_entregables_update_propio on public.trabajo_entregables for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy trabajo_entregables_delete_propio on public.trabajo_entregables for delete to authenticated using (owner_id = (select auth.uid()));
