-- T-21 · SEC-002 · Marcar las invitaciones que se aceptaron con una cuenta que ya existía.
--
-- InsForge tiene el registro abierto y la app lo necesita así (crearUsuarioInsforge crea la cuenta de
-- quien acepta una invitación con signUp, sin verificación de correo). Consecuencia: alguien que
-- conozca el correo de una empresa o de un colaborador puede registrarlo ANTES de que su dueño acepte,
-- y la invitación (que solo exige que el correo coincida) la vincularía a esa cuenta.
--
-- No se puede cerrar el registro sin romper las invitaciones, así que se hace visible: al aceptar, la
-- invitación guarda si la cuenta es anterior a ella (cuenta_previa). El panel lo muestra junto al
-- acceso de la empresa y en la tarjeta del colaborador para confirmarlo con la persona. Una cuenta
-- creada al aceptar (el flujo normal) siempre es posterior a la invitación y no se marca.
--
-- Las invitaciones ya aceptadas quedan en false: no hay forma fiable de reconstruirlo.

alter table public.invitaciones add column if not exists cuenta_previa boolean not null default false;

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
  v_previa boolean;
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

  -- La cuenta existía antes de la invitación: alguien pudo registrar ese correo antes que su dueño.
  select u.email, u.created_at < v_inv.created_at into v_correo, v_previa from auth.users u where u.id = v_uid;
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

  update public.invitaciones set usada_en = now(), usuario_id = v_uid, cuenta_previa = coalesce(v_previa, false) where id = v_inv.id;
  return jsonb_build_object('tipo', v_inv.tipo, 'slug', v_slug);
end;
$$;

create or replace function public.equipo_listar()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id, 'nombre', m.nombre, 'correo', u.email, 'activo', m.activo, 'desde', m.created_at,
           'cuenta_previa', coalesce((
             select i.cuenta_previa from public.invitaciones i
             where i.usuario_id = m.user_id and i.tipo = 'colaborador' and i.usada_en is not null
             order by i.usada_en desc limit 1
           ), false),
           'empresas', coalesce((
             select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre) order by c.nombre)
             from public.miembro_empresas me join public.clientes c on c.id = me.cliente_id
             where me.user_id = m.user_id
           ), '[]'::jsonb)
         ) order by m.activo desc, m.nombre), '[]'::jsonb)
  from public.miembros m join auth.users u on u.id = m.user_id
  where m.rol = 'colaborador' and public.es_propietario();
$$;
