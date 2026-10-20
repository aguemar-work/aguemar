-- Vigente según migrations/20261016200506_equipo-invitaciones.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
