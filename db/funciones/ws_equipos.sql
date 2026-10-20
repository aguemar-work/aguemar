-- Vigente según migrations/20261015150431_fichas-portal.sql.
-- Generado con `npm run db:funciones`: no se edita a mano; los cambios van en una migración nueva.

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
