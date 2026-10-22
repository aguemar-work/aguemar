# Cambios

Una entrada por despliegue a producción. Si el despliegue lleva migración, la entrada incluye la migración, el respaldo previo y el checklist del README (Base de datos, paso 5), y se marca el commit con un tag `vX.Y.Z` (`git tag -a v0.17.0 -m "…"`).

## Sin publicar

Sprint 5 · workspace (rama `sprint5-workspace`, aún no fusionada). **Lleva 2 migraciones, solo en staging**: `comentarios-cotizacion` y `ws-preferencias`; en producción se aplican antes de fusionar (A-19).

- **Mi cuenta** en el espacio de la empresa: su correo, cambiar la contraseña con un código al correo y apagar o encender los avisos por correo (T-34).
- **Dudas sobre la cotización:** la empresa pregunta bajo la cotización antes de aceptar, tú ves la duda en el detalle y en la Bandeja y respondes ahí mismo, en la tarjeta (T-35). Aviso junto a la casilla de conformidad.

## v0.16.0 · 22/10/2026

Sin migración. Next 16.4.2 y `eslint-config-next` 16.4.2 (T-27, rama `next-16`): Turbopack también en el build (19 s frente a 66 s), `src/middleware.ts` pasa a `src/proxy.ts` con el mismo matcher, cuatro arreglos de lint que señalaron las reglas nuevas y `npm audit` de producción en 0 vulnerabilidades. Revisado en pantalla el 22/10 (entrar con los dos roles, panel lateral); tipos, lint, 207 unit y build en verde sobre la fusión. Cierra los PR #5 y #6 de Dependabot.

## v0.15.1 · 22/10/2026

Sin migración. El job `e2e` del CI falló en `main` con v0.15.0: tras eliminar un trabajo desde el panel lateral, volver a la lista con el router tardaba 8–9 s en el build de producción y el CI (5 s por expectativa) lo daba por colgado. `ConfirmarEliminar` vuelve a la lista con una carga normal de página (`irTrasAccion`, misma regla que `abrirCreado` al crear): de 9 s a 4 s en las mismas pruebas.

## v0.15.0 · 22/10/2026

Sprints 1 a 5 de la actualización post-auditoría en producción. Antes de desplegar, con la CLI en el proyecto principal y respaldo propio de las 13:26 (`_respaldos/aguemar-Project_AGUEMAR-2026-10-22-1326.sql`): reinicio de datos conservando la configuración (`npm run db:reiniciar -- Project_AGUEMAR`, decisión del 22/10) y las **11 migraciones** aplicadas en orden con `npm run db:migrate` (`lead-topes`, `lead-topes-codigos`, `lead-topes-hint`, `ws-modulos`, `comentarios-autor`, `invitacion-cuenta-previa`, `pendiente-unico`, `cotizacion-version`, `anulaciones-estado`, `anulaciones`, `aceptacion-origen`). Despliegue por avance directo de `actualizacion-post-auditoria` a `main`, tag `v0.15.0`. Pendiente: renovar el respaldo manual de InsForge y borrar en Auth → Users los usuarios de empresa antiguos.

Sprint 1 de la actualización post-auditoría (`docs/auditoria/98-tareas.md`). Sin migraciones.

- **Landing:** contraste del formulario de contacto (T-01); imagen al compartir `/en` y datos estructurados sin datos personales (T-02a); de 242 a 164 kB de JavaScript inicial (T-07).
- **Documentos y páginas públicas:** sin marcadores `[PENDIENTE]` en PDF, `/privacidad` ni servicios, y aviso en el inicio si a Mi marca le faltan datos (T-03). Texto de los PDF que se copia y se busca bien (T-13).
- **Errores y alertas:** mensajes de error sin detalle técnico, con referencia para Sentry (T-04). El cron de recordatorios y los PDF avisan a Sentry cuando fallan (T-05).
- **Seguridad:** las 30 acciones solo del propietario comprueban el rol (T-06).
- **Accesos:** el perfil Soporte incluye Solicitudes (T-08).
- **Accesibilidad:** campos obligatorios anunciados, botones de cerrar de 32 px, errores que duran 10 s (T-09); calendario, foco bajo barras fijas, contrastes, portal y tablas (T-10).
- **Panel y workspace:** 404 que conserva el menú (T-11); las alertas del inicio llevan a la lista filtrada (T-12); mensaje de WhatsApp para confirmar la cotización aceptada (T-14).
- **Operación:** checklist de migración a producción en el README y este archivo (T-15); `robots.txt` deja leer el `noindex` de `/d/` y `/login` (T-16).

Sprint 2 de la misma actualización. **Lleva 6 migraciones, aplicadas hasta ahora solo en staging**; en producción se aplican con el checklist del README, migrando **antes** de desplegar (la ficha de la empresa ya consulta la columna nueva de invitaciones):

- `lead-topes`, `lead-topes-codigos`, `lead-topes-hint`: el tope global de `crear_lead` deja de bloquear a los visitantes (va al respaldo por correo) y el tope por IP vuelve a rechazar, distinguidos por `hint` (T-17).
- `ws-modulos`: `ws_trabajos`, `ws_trabajo` y `ws_comentarios` exigen el módulo activo (T-18).
- `comentarios-autor`: lo que escribió la empresa solo lo cambia la empresa (T-19).
- `invitacion-cuenta-previa`: las invitaciones marcan si la cuenta ya existía antes (T-21).
- Sin migración: inventario de vistas (T-20) y nota sobre la limpieza heredada y los errores SQL (T-22).

Sprint 3, sin migraciones: pruebas de la lógica crítica en SQL (`tests/e2e/db.spec.ts`, T-23) y casos de totales compartidos entre TypeScript y la base (T-26). La vista previa de una cotización ya no se desvía un céntimo de lo que guarda la base con cantidades de tres decimales.

- Pruebas de navegador contra un build de producción, con un job `e2e` en CI y ejecución nocturna (T-24, T-25).
- **Arreglo:** los enlaces del panel ya no precargan; con precarga, el clic que abre una ficha en el panel lateral a veces no respondía en producción (componente `Enlace`).
- Rama `next-16` (aparte): Next 16.4.2, `npm audit` de producción en 0 vulnerabilidades (T-27).

Sprint 4 de la misma actualización. **Lleva 5 migraciones más, solo en staging** (se aplican en orden, después de las 6 del sprint 2 y antes de desplegar): `pendiente-unico`, `cotizacion-version`, `anulaciones-estado`, `anulaciones` y `aceptacion-origen`.

- **Pendiente de pago:** una sola cuenta (la FIFO de `deudas_cotizacion`) para el detalle, el workspace, el portal y las fichas (T-28). Aviso antes de registrar un cobro que se pasa de lo pendiente (T-32).
- **Cotización versionada:** al enviarla se congela una copia con su huella; aceptar acepta esa copia; editar una enviada la devuelve a borrador con una versión más. El PDF dice `v{n} · huella` (T-29).
- **Anulaciones:** una cotización aceptada se puede anular con motivo, sin borrar la aceptación; los cobros se anulan y quedan tachados en vez de borrarse (T-30).
- **Aceptación:** todas las pantallas y el PDF dicen quién aceptó y cómo; al registrarla desde el panel, la empresa recibe una constancia por correo (T-31).
- **Errores:** envoltorio `accion()` en las Server Actions; los errores inesperados llegan a Sentry con la acción que falló (T-33).

Sprint 5 · flujo de la cotización, sin migraciones (decisión D13 del 22/10: quitar pasos, no sumar módulos).

- **Arreglo de B-01 al crear:** tras crear un trabajo, empresa, cotización, ficha, informe, equipo, brief o acta (y al duplicar una cotización o convertir una solicitud en trabajo), la página del elemento nuevo se abre con una carga normal; en producción el salto sin recarga se quedaba en «Guardando…» (T-36).
- **Cotización:** la empresa se puede crear desde el mismo formulario con nombre, documento, contacto, WhatsApp y correo (T-37). Al enviar, el diálogo dice a qué correo salió el aviso y permite copiar el enlace, descargar el PDF o abrir WhatsApp (T-38). Desde ese diálogo, y desde el de «Marcar aceptada», se invita a la empresa a su espacio en un clic si tiene correo y aún no tiene usuario; se le activa el módulo Cotizaciones, y Proyectos si ya aceptó (T-39).
- **Operación:** `npm run db:reiniciar -- <contexto>` (`scripts/reiniciar-datos.mjs` + `db/reiniciar-datos.sql`) vacía los datos operativos conservando la configuración, con respaldo previo y el nombre del contexto como seguro; `--todo` deja staging listo para volver a sembrar. Probado en staging en ambos modos.
- **PDF de la cotización aceptada:** la sección «Conformidad» con líneas de firma se reemplaza por «Aceptación», con quién, cuándo y cómo la aceptó; las firmas solo salen en una cotización todavía no aceptada.

## v0.14.5 · 20/10/2026

Fase 14.5 y Sprint 2 en producción: migraciones `inmutabilidad-aceptados` y `sprint2-medicion`, con respaldo previo del 20/10. Sin tag en su momento: se registra aquí como punto de partida.
