-- =====================================================================
-- Fase 10 · Landing pública
-- landing_datos(): lo que la landing muestra sin sesión, en una sola llamada:
-- datos públicos de la marca (sin datos de pago ni condiciones) y los servicios
-- marcados "visible en la landing". El dueño es el primer perfil de marca,
-- igual que en crear_lead().
-- =====================================================================

create or replace function public.landing_datos()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with dueno as (
    select p.* from public.perfil_marca p order by p.created_at limit 1
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
revoke all on function public.landing_datos() from public;
grant execute on function public.landing_datos() to anon, authenticated;
