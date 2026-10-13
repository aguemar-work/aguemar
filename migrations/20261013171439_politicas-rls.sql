-- =====================================================================
-- agueMar Studio · Row Level Security
-- Cada usuario solo lee y escribe sus filas (owner_id = auth.uid()).
-- anon no accede a ninguna tabla: el portal usa funciones security definer.
-- Sin SQL dinámico: InsForge rechaza bloques DO con EXECUTE.
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- perfil_marca
alter table public.perfil_marca enable row level security;
revoke all on public.perfil_marca from anon;
grant select, insert, update, delete on public.perfil_marca to authenticated;
create policy perfil_marca_select_propio on public.perfil_marca
  for select to authenticated using (owner_id = (select auth.uid()));
create policy perfil_marca_insert_propio on public.perfil_marca
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy perfil_marca_update_propio on public.perfil_marca
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy perfil_marca_delete_propio on public.perfil_marca
  for delete to authenticated using (owner_id = (select auth.uid()));

-- clientes
alter table public.clientes enable row level security;
revoke all on public.clientes from anon;
grant select, insert, update, delete on public.clientes to authenticated;
create policy clientes_select_propio on public.clientes
  for select to authenticated using (owner_id = (select auth.uid()));
create policy clientes_insert_propio on public.clientes
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy clientes_update_propio on public.clientes
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy clientes_delete_propio on public.clientes
  for delete to authenticated using (owner_id = (select auth.uid()));

-- equipos
alter table public.equipos enable row level security;
revoke all on public.equipos from anon;
grant select, insert, update, delete on public.equipos to authenticated;
create policy equipos_select_propio on public.equipos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy equipos_insert_propio on public.equipos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy equipos_update_propio on public.equipos
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy equipos_delete_propio on public.equipos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- servicios
alter table public.servicios enable row level security;
revoke all on public.servicios from anon;
grant select, insert, update, delete on public.servicios to authenticated;
create policy servicios_select_propio on public.servicios
  for select to authenticated using (owner_id = (select auth.uid()));
create policy servicios_insert_propio on public.servicios
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy servicios_update_propio on public.servicios
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy servicios_delete_propio on public.servicios
  for delete to authenticated using (owner_id = (select auth.uid()));

-- contadores
alter table public.contadores enable row level security;
revoke all on public.contadores from anon;
grant select, insert, update, delete on public.contadores to authenticated;
create policy contadores_select_propio on public.contadores
  for select to authenticated using (owner_id = (select auth.uid()));
create policy contadores_insert_propio on public.contadores
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy contadores_update_propio on public.contadores
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy contadores_delete_propio on public.contadores
  for delete to authenticated using (owner_id = (select auth.uid()));

-- cotizaciones
alter table public.cotizaciones enable row level security;
revoke all on public.cotizaciones from anon;
grant select, insert, update, delete on public.cotizaciones to authenticated;
create policy cotizaciones_select_propio on public.cotizaciones
  for select to authenticated using (owner_id = (select auth.uid()));
create policy cotizaciones_insert_propio on public.cotizaciones
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cotizaciones_update_propio on public.cotizaciones
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cotizaciones_delete_propio on public.cotizaciones
  for delete to authenticated using (owner_id = (select auth.uid()));

-- cotizacion_items
alter table public.cotizacion_items enable row level security;
revoke all on public.cotizacion_items from anon;
grant select, insert, update, delete on public.cotizacion_items to authenticated;
create policy cotizacion_items_select_propio on public.cotizacion_items
  for select to authenticated using (owner_id = (select auth.uid()));
create policy cotizacion_items_insert_propio on public.cotizacion_items
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cotizacion_items_update_propio on public.cotizacion_items
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cotizacion_items_delete_propio on public.cotizacion_items
  for delete to authenticated using (owner_id = (select auth.uid()));

-- fichas
alter table public.fichas enable row level security;
revoke all on public.fichas from anon;
grant select, insert, update, delete on public.fichas to authenticated;
create policy fichas_select_propio on public.fichas
  for select to authenticated using (owner_id = (select auth.uid()));
create policy fichas_insert_propio on public.fichas
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy fichas_update_propio on public.fichas
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fichas_delete_propio on public.fichas
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ficha_diagnosticos
alter table public.ficha_diagnosticos enable row level security;
revoke all on public.ficha_diagnosticos from anon;
grant select, insert, update, delete on public.ficha_diagnosticos to authenticated;
create policy ficha_diagnosticos_select_propio on public.ficha_diagnosticos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy ficha_diagnosticos_insert_propio on public.ficha_diagnosticos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy ficha_diagnosticos_update_propio on public.ficha_diagnosticos
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ficha_diagnosticos_delete_propio on public.ficha_diagnosticos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ficha_trabajos
alter table public.ficha_trabajos enable row level security;
revoke all on public.ficha_trabajos from anon;
grant select, insert, update, delete on public.ficha_trabajos to authenticated;
create policy ficha_trabajos_select_propio on public.ficha_trabajos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy ficha_trabajos_insert_propio on public.ficha_trabajos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy ficha_trabajos_update_propio on public.ficha_trabajos
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ficha_trabajos_delete_propio on public.ficha_trabajos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ficha_incidencias
alter table public.ficha_incidencias enable row level security;
revoke all on public.ficha_incidencias from anon;
grant select, insert, update, delete on public.ficha_incidencias to authenticated;
create policy ficha_incidencias_select_propio on public.ficha_incidencias
  for select to authenticated using (owner_id = (select auth.uid()));
create policy ficha_incidencias_insert_propio on public.ficha_incidencias
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy ficha_incidencias_update_propio on public.ficha_incidencias
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ficha_incidencias_delete_propio on public.ficha_incidencias
  for delete to authenticated using (owner_id = (select auth.uid()));

-- ficha_recomendaciones
alter table public.ficha_recomendaciones enable row level security;
revoke all on public.ficha_recomendaciones from anon;
grant select, insert, update, delete on public.ficha_recomendaciones to authenticated;
create policy ficha_recomendaciones_select_propio on public.ficha_recomendaciones
  for select to authenticated using (owner_id = (select auth.uid()));
create policy ficha_recomendaciones_insert_propio on public.ficha_recomendaciones
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy ficha_recomendaciones_update_propio on public.ficha_recomendaciones
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy ficha_recomendaciones_delete_propio on public.ficha_recomendaciones
  for delete to authenticated using (owner_id = (select auth.uid()));

-- plantillas_checklist
alter table public.plantillas_checklist enable row level security;
revoke all on public.plantillas_checklist from anon;
grant select, insert, update, delete on public.plantillas_checklist to authenticated;
create policy plantillas_checklist_select_propio on public.plantillas_checklist
  for select to authenticated using (owner_id = (select auth.uid()));
create policy plantillas_checklist_insert_propio on public.plantillas_checklist
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy plantillas_checklist_update_propio on public.plantillas_checklist
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy plantillas_checklist_delete_propio on public.plantillas_checklist
  for delete to authenticated using (owner_id = (select auth.uid()));

-- leads
alter table public.leads enable row level security;
revoke all on public.leads from anon;
grant select, insert, update, delete on public.leads to authenticated;
create policy leads_select_propio on public.leads
  for select to authenticated using (owner_id = (select auth.uid()));
create policy leads_insert_propio on public.leads
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy leads_update_propio on public.leads
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy leads_delete_propio on public.leads
  for delete to authenticated using (owner_id = (select auth.uid()));

-- enlaces_publicos
alter table public.enlaces_publicos enable row level security;
revoke all on public.enlaces_publicos from anon;
grant select, insert, update, delete on public.enlaces_publicos to authenticated;
create policy enlaces_publicos_select_propio on public.enlaces_publicos
  for select to authenticated using (owner_id = (select auth.uid()));
create policy enlaces_publicos_insert_propio on public.enlaces_publicos
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy enlaces_publicos_update_propio on public.enlaces_publicos
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy enlaces_publicos_delete_propio on public.enlaces_publicos
  for delete to authenticated using (owner_id = (select auth.uid()));

-- aceptaciones
alter table public.aceptaciones enable row level security;
revoke all on public.aceptaciones from anon;
grant select, insert, update, delete on public.aceptaciones to authenticated;
create policy aceptaciones_select_propio on public.aceptaciones
  for select to authenticated using (owner_id = (select auth.uid()));
-- Las aceptaciones las crea el portal (función security definer); el panel solo lee y borra.
revoke insert, update on public.aceptaciones from authenticated;
create policy aceptaciones_delete_propio on public.aceptaciones
  for delete to authenticated using (owner_id = (select auth.uid()));
