-- =====================================================================
-- agueMar Studio · 0002 · Row Level Security
-- Cada usuario solo lee y escribe sus filas (owner_id = auth.uid()).
-- anon no accede a ninguna tabla: el portal usa funciones security definer.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'perfil_marca','clientes','equipos','servicios','contadores','cotizaciones','cotizacion_items',
    'fichas','ficha_diagnosticos','ficha_trabajos','ficha_incidencias','ficha_recomendaciones',
    'plantillas_checklist','leads','enlaces_publicos','aceptaciones'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = auth.uid())',
      t || '_select_propio', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = auth.uid())',
      t || '_insert_propio', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_update_propio', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = auth.uid())',
      t || '_delete_propio', t
    );
  end loop;
end
$$;

-- Las aceptaciones las crea el portal (función security definer); el panel solo lee y borra.
drop policy aceptaciones_insert_propio on public.aceptaciones;
drop policy aceptaciones_update_propio on public.aceptaciones;
