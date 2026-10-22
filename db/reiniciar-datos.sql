-- Reinicio de datos: deja la base como recién instalada, conservando la configuración.
--
-- Borra todo lo operativo (empresas y sus accesos, trabajos, calendario, documentos, cotizaciones,
-- cobros, aceptaciones, leads, eventos de la landing, invitaciones, colaboradores) y reinicia la
-- numeración (COT, FT, BR, AE, INF). Conserva Mi marca (`perfil_marca`), el catálogo (`servicios`),
-- las plantillas de checklist, el propietario (`miembros`) y `ajustes_sistema` (clave del cron).
--
-- Se ejecuta con `npm run db:reiniciar -- <nombre del proyecto>` (scripts/reiniciar-datos.mjs), que
-- exige escribir el nombre del contexto actual de la CLI y hace un respaldo antes. TRUNCATE no dispara
-- los triggers por fila que impiden borrar lo aceptado o anulado (son el candado de la aplicación, no
-- de un reinicio deliberado) y CASCADE arrastra lo que referencia a estas tablas.
--
-- Lo que NO toca: las cuentas de `auth.users` (usuarios de empresa y colaboradores). Se borran desde
-- InsForge → Auth → Users; si se dejan, al invitar de nuevo el mismo correo la invitación marca
-- "cuenta previa".

truncate table
  public.aceptaciones,
  public.actas_entrega,
  public.actividades,
  public.briefs,
  public.clientes,
  public.cobros,
  public.comentarios,
  public.contadores,
  public.cotizacion_items,
  public.cotizaciones,
  public.enlaces_publicos,
  public.equipos,
  public.eventos_landing,
  public.ficha_diagnosticos,
  public.ficha_incidencias,
  public.ficha_recomendaciones,
  public.ficha_trabajos,
  public.fichas,
  public.informes,
  public.invitaciones,
  public.leads,
  public.miembro_empresas,
  public.recordatorios_cobro,
  public.solicitudes,
  public.trabajo_entregables,
  public.trabajo_etapas,
  public.trabajo_tareas,
  public.trabajos
cascade;

-- Los colaboradores salen del equipo; el propietario se queda.
delete from public.miembros where rol = 'colaborador';
