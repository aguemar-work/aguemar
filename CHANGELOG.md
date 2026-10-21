# Cambios

Una entrada por despliegue a producción. Si el despliegue lleva migración, la entrada incluye la migración, el respaldo previo y el checklist del README (Base de datos, paso 5), y se marca el commit con un tag `vX.Y.Z` (`git tag -a v0.17.0 -m "…"`).

## Sin publicar

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

## v0.14.5 · 20/10/2026

Fase 14.5 y Sprint 2 en producción: migraciones `inmutabilidad-aceptados` y `sprint2-medicion`, con respaldo previo del 20/10. Sin tag en su momento: se registra aquí como punto de partida.
