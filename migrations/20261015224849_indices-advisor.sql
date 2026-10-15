-- Fase 11 · Índices que sugirió el advisor de InsForge (claves foráneas y columnas de RLS sin índice).
create index if not exists cotizacion_items_owner_idx on public.cotizacion_items (owner_id);
create index if not exists cotizacion_items_servicio_idx on public.cotizacion_items (servicio_id);
create index if not exists aceptaciones_owner_idx on public.aceptaciones (owner_id);
create index if not exists trabajo_tareas_owner_idx on public.trabajo_tareas (owner_id);
create index if not exists trabajo_entregables_owner_idx on public.trabajo_entregables (owner_id);
create index if not exists ficha_incidencias_owner_idx on public.ficha_incidencias (owner_id);
create index if not exists comentarios_autor_idx on public.comentarios (autor_uid);
