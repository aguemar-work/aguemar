-- =====================================================================
-- agueMar Studio · 0001 · Esquema base
-- Todas las tablas: id uuid, owner_id (auth.users), created_at, updated_at.
-- Montos en céntimos enteros. Fechas civiles como date (zona America/Lima).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.tipo_doc as enum ('RUC', 'DNI');
create type public.moneda as enum ('PEN', 'USD');
create type public.igv_modo as enum ('incluido', 'sumar');
create type public.estado_cotizacion as enum ('borrador', 'enviada', 'aceptada', 'rechazada', 'vencida');
create type public.modalidad_servicio as enum ('remota', 'presencial');
create type public.estado_final_ficha as enum ('operativo', 'operativo_observaciones', 'requiere_reparacion');
create type public.estado_diagnostico as enum ('optimo', 'mejorable', 'atendido', 'critico');
create type public.estado_incidencia as enum ('resuelta', 'pendiente', 'observacion');
create type public.estado_lead as enum ('nuevo', 'contactado', 'convertido');
create type public.tipo_documento as enum ('cotizacion', 'ficha');

-- ---------- Utilidades ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- perfil_marca ----------
create table public.perfil_marca (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre_comercial text not null default 'agueMar',
  responsable text not null default 'Alejandro Guevara Martínez',
  cargo text not null default 'Soporte técnico',
  ruc text,
  telefono text,
  correo text,
  web text,
  direccion text,
  igv_pct integer not null default 1800 check (igv_pct >= 0 and igv_pct <= 10000), -- 1800 = 18,00 %
  moneda_default public.moneda not null default 'PEN',
  validez_dias_default integer not null default 15 check (validez_dias_default > 0),
  condiciones_default text,
  pago_cuenta text,
  pago_cci text,
  pago_yape text,
  pago_plin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

-- ---------- clientes ----------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo_doc public.tipo_doc not null default 'DNI',
  num_doc text,
  contacto text,
  telefono text,
  correo text,
  direccion text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_num_doc_formato check (
    num_doc is null
    or (tipo_doc = 'RUC' and num_doc ~ '^\d{11}$')
    or (tipo_doc = 'DNI' and num_doc ~ '^\d{8}$')
  )
);
create index clientes_owner_idx on public.clientes (owner_id);
create unique index clientes_owner_doc_idx on public.clientes (owner_id, num_doc) where num_doc is not null;

-- ---------- equipos ----------
create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  marca text,
  modelo text,
  serie text not null check (length(trim(serie)) > 0),
  sistema_operativo text,
  procesador text,
  ram text,
  almacenamiento text,
  grafica text,
  bateria text,
  bios text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, serie)
);
create index equipos_owner_idx on public.equipos (owner_id);
create index equipos_cliente_idx on public.equipos (cliente_id);

-- ---------- servicios ----------
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  precio_base integer check (precio_base is null or precio_base >= 0), -- céntimos, "desde"
  unidad text not null default 'servicio',
  visible_landing boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index servicios_owner_idx on public.servicios (owner_id);

-- ---------- contadores (numeración correlativa) ----------
create table public.contadores (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null, -- 'COT' | 'FT'
  anio integer not null,
  ultimo integer not null default 0,
  primary key (owner_id, tipo, anio)
);

-- ---------- cotizaciones ----------
create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero text, -- COT-AAAA-NNN, lo asigna el trigger si viene null
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  fecha date not null default (now() at time zone 'America/Lima')::date,
  validez_dias integer not null default 15 check (validez_dias > 0),
  asunto text not null default '',
  moneda public.moneda not null default 'PEN',
  igv_pct integer not null default 1800 check (igv_pct >= 0),
  igv_modo public.igv_modo not null default 'sumar',
  subtotal integer not null default 0,
  igv integer not null default 0,
  total integer not null default 0,
  condiciones text,
  notas text,
  estado public.estado_cotizacion not null default 'borrador',
  enviada_en timestamptz,
  aceptada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero)
);
create index cotizaciones_owner_idx on public.cotizaciones (owner_id);
create index cotizaciones_cliente_idx on public.cotizaciones (cliente_id);
create index cotizaciones_estado_idx on public.cotizaciones (owner_id, estado);

create table public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  descripcion text not null check (length(trim(descripcion)) > 0),
  cantidad numeric(12,3) not null default 1 check (cantidad > 0),
  precio_unitario integer not null default 0 check (precio_unitario >= 0),
  descuento integer not null default 0 check (descuento >= 0),
  importe integer not null default 0,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cotizacion_items_cot_idx on public.cotizacion_items (cotizacion_id);

-- ---------- fichas ----------
create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero text, -- FT-AAAA-NNN
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  equipo_id uuid references public.equipos(id) on delete set null,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  fecha date not null default (now() at time zone 'America/Lima')::date,
  tipo_servicio text not null default 'Mantenimiento preventivo',
  modalidad public.modalidad_servicio not null default 'remota',
  titular text not null default '',
  resumen text,
  estado_final public.estado_final_ficha not null default 'operativo',
  indicadores jsonb not null default '[]'::jsonb, -- [{ "valor": "0 %", "etiqueta": "desgaste SSD" }], máx. 4
  proximo_mantenimiento date,
  recordatorio_enviado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, numero),
  constraint fichas_indicadores_max check (jsonb_typeof(indicadores) = 'array' and jsonb_array_length(indicadores) <= 4)
);
create index fichas_owner_idx on public.fichas (owner_id);
create index fichas_cliente_idx on public.fichas (cliente_id);
create index fichas_equipo_idx on public.fichas (equipo_id);
create index fichas_proximo_idx on public.fichas (owner_id, proximo_mantenimiento);

create table public.ficha_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  elemento text not null,
  resultado text not null default '',
  estado public.estado_diagnostico not null default 'optimo',
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ficha_diagnosticos_ficha_idx on public.ficha_diagnosticos (ficha_id);

create table public.ficha_trabajos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  titulo text not null,
  detalle text,
  hecho boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ficha_trabajos_ficha_idx on public.ficha_trabajos (ficha_id);

create table public.ficha_incidencias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  titulo text not null,
  causa text,
  solucion text,
  estado public.estado_incidencia not null default 'resuelta',
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ficha_incidencias_ficha_idx on public.ficha_incidencias (ficha_id);

create table public.ficha_recomendaciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ficha_id uuid not null references public.fichas(id) on delete cascade,
  texto text not null,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ficha_recomendaciones_ficha_idx on public.ficha_recomendaciones (ficha_id);

-- ---------- plantillas_checklist ----------
create table public.plantillas_checklist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo_servicio text not null,
  items jsonb not null default '[]'::jsonb, -- [{ "titulo": "Respaldo", "detalle": "..." }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, tipo_servicio),
  constraint plantillas_items_array check (jsonb_typeof(items) = 'array')
);

-- ---------- leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade, -- lo asigna crear_lead()
  nombre text not null,
  telefono text,
  correo text,
  servicio text,
  mensaje text,
  estado public.estado_lead not null default 'nuevo',
  ip inet,
  user_agent text,
  cliente_id uuid references public.clientes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_owner_idx on public.leads (owner_id, estado);
create index leads_ip_idx on public.leads (ip, created_at);

-- ---------- enlaces_publicos ----------
create or replace function public.generar_token()
returns text
language sql
volatile
as $$
  select translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');
$$;

create table public.enlaces_publicos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default public.generar_token(),
  tipo public.tipo_documento not null,
  documento_id uuid not null,
  revocado boolean not null default false,
  vistas integer not null default 0,
  ultima_vista timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo, documento_id)
);
create index enlaces_publicos_owner_idx on public.enlaces_publicos (owner_id);

-- ---------- aceptaciones ----------
create table public.aceptaciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  nombre text not null,
  dni text not null check (dni ~ '^\d{8}$'),
  ip inet,
  user_agent text,
  aceptado_en timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index aceptaciones_cot_idx on public.aceptaciones (cotizacion_id);

-- ---------- Triggers updated_at ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'perfil_marca','clientes','equipos','servicios','cotizaciones','cotizacion_items',
    'fichas','ficha_diagnosticos','ficha_trabajos','ficha_incidencias','ficha_recomendaciones',
    'plantillas_checklist','leads','enlaces_publicos','aceptaciones'
  ] loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end
$$;
