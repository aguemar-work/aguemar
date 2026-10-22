-- Índices que sugirió el advisor de InsForge el 22/10: claves foráneas y columnas de RLS sin índice.
-- Solo aditiva (if not exists): compatible con el código publicado y repetible en producción.
-- No se indexa comentarios.es_propietario (booleano: un índice no ayudaría) ni se borran los
-- "sin uso": con pocos datos marcan 0 escaneos, pero sostienen la RLS y las claves foráneas.

-- Claves foráneas
create index if not exists solicitudes_trabajo_idx on public.solicitudes (trabajo_id);
create index if not exists solicitudes_cotizacion_idx on public.solicitudes (cotizacion_id);
create index if not exists fichas_cotizacion_idx on public.fichas (cotizacion_id);
create index if not exists leads_cliente_idx on public.leads (cliente_id);
create index if not exists invitaciones_usuario_idx on public.invitaciones (usuario_id);
create index if not exists cotizaciones_anulada_por_idx on public.cotizaciones (anulada_por);

-- owner_id (clave foránea y columna de las políticas)
create index if not exists trabajo_etapas_owner_idx on public.trabajo_etapas (owner_id);
create index if not exists ficha_trabajos_owner_idx on public.ficha_trabajos (owner_id);
create index if not exists ficha_diagnosticos_owner_idx on public.ficha_diagnosticos (owner_id);
create index if not exists ficha_recomendaciones_owner_idx on public.ficha_recomendaciones (owner_id);
