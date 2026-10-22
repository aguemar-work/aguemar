# 98 · Hoja de tareas: actualización post-auditoría

Hoja de trabajo para ejecutar `99-plan-de-accion.md`. Escrita el 21/10/2026 sobre `main` = `643349c`. Las líneas citadas son de ese commit: si el archivo cambió, busca por el fragmento citado, no por el número.

Dos tipos de tarea:
- **A-xx: las hace Alejandro.** Son de consola o de cuentas: GitHub, Sentry, Vercel, InsForge, datos del negocio.
- **T-xx: las hace un agente en el repo.** Cada una dice qué archivos toca, si lleva migración, qué decisión ya está tomada y cómo se comprueba que quedó hecha.

## 0. Reglas para el agente

1. **Antes de empezar.** Lee `CLAUDE.md` (convenciones del repo) y esta hoja. Abre un informe `01`–`10` solo si necesitas el detalle del ID que vas a tocar.
2. **Cada sprint es una fase de `CLAUDE.md`.** Presenta el plan breve del sprint (qué tareas, en qué orden) y espera la confirmación de Alejandro antes de escribir código.
3. **Commits.** Una tarea, un commit; el mensaje empieza por el ID (`T-03 · UX-001: …`). Si `main` ya está protegida (A-02), trabaja en una rama por sprint (`sprint-1`, …) y abre un PR. Nunca hagas push a `main` ni fuerces.
4. **Verificación mínima de toda tarea**, siempre en verde antes del commit:

   ```bash
   npm run typecheck && npm run lint && npm test
   ```

   Si la tarea afecta al build o al bundle, compila en otra carpeta para no pisar el `.next` del servidor de Alejandro:

   ```bash
   NEXT_DIST_DIR=.next-verify NEXT_PUBLIC_SITE_URL=https://aguemar.com npx next build
   ```

5. **Pantalla.** El agente no arranca, reinicia ni detiene `npm run dev`. Si una tarea necesita revisión visual, se marca **Hecha · falta pantalla** con una lista de qué mirar en escritorio y a 360 px. Solo se verifica contra `http://localhost:3000` cuando Alejandro tenga el servidor corriendo.
6. **Migraciones.** Se crean con `npx -y @insforge/cli db migrations new <nombre>` y van sin `BEGIN/COMMIT` y sin bloques `DO` con `EXECUTE`. Toda función `security definer` lleva `set search_path = pg_catalog, public, pg_temp` y `revoke all … from public, anon`.
   - El agente las aplica **solo en staging** (`npm run db:migrate` con la CLI en staging), corre `npm run db:funciones` y commitea la migración junto con `db/funciones/`.
   - **Producción la aplica Alejandro** con el checklist de T-15 (tarea A-12).
7. **Fuera de alcance.** Nada contra producción, nada con credenciales reales. Las pruebas que escriben en staging (`tests/e2e/*.spec.ts`) se corren solo con la autorización de A-10.
8. **Estado.** Al cerrar una tarea, actualiza su fila en §3 (Pendiente → Hecha / Hecha · falta pantalla / Bloqueada) con el hash del commit.

## 1. Decisiones ya tomadas

Resuelven lo que la auditoría dejó abierto o se contradecía. Si Alejandro cambia una, se edita aquí antes de la tarea.

| ID | Tema | Decisión | Motivo |
|---|---|---|---|
| D1 | SEC-003, anti-spam del formulario | **Sin clave de servicio.** En `crear_lead`, el tope por IP va **antes** que el tope global, y el global usa otro código de error (`53300`). La Server Action deriva el tope global al respaldo por correo; el tope por IP sigue rechazando | README y `CLAUDE.md` prohíben la clave de servicio en Vercel. El tope por IP solo sirve con la IP real que pone el servidor; quien llama la RPC directo se topa con el global, y ese ya no bloquea a los visitantes reales |
| D2 | QA-008, cobro mayor que el pendiente | La base no cambia (los cobros sueltos siguen el reparto FIFO). En el panel, si un cobro **ligado** a una cotización supera su pendiente, se pide confirmación indicando el exceso | Un cero de más no se reparte en silencio |
| D3 | PRO-001, cotización enviada | **Versionar.** Al enviar se congela la copia con su huella (`enviada_documento`, `enviada_huella`, `version`). Workspace y portal muestran la copia enviada; aceptar acepta esa copia. Editar una enviada la devuelve a `borrador` con `version + 1` y obliga a reenviar. El PDF imprime `v{n} · {8 primeros de la huella}` | Respuesta 4: el PDF va por WhatsApp y tiene que poder cotejarse con lo aceptado |
| D4 | PRO-002, marcha atrás | Estado nuevo `anulada` para cotizaciones aceptadas (motivo, fecha, quién), que la saca de `deudas_cotizacion` y del cron sin borrar la aceptación. Los cobros no se borran: llevan `anulado_en` y `anulado_motivo` y se muestran tachados | Lo aceptado no cambia (ADR-07), pero un proyecto puede caerse |
| D5 | PRO-007, aceptación | Sin OTP ni firma. Cuando la registra Alejandro desde el panel, el DNI es opcional y la vista, el PDF y el correo dicen "Registrada por aguemar el {fecha}". La verificación final es el mensaje de WhatsApp de T-14 | Respuesta 4 |
| D6 | PRO-003, comprobantes | Un PDF por cobro (factura o recibo por honorarios descargado de SUNAT), en un bucket privado con URL firmada. Se descarga en el workspace (Cotizaciones y cobros) y en el portal. Sin integración con SUNAT | Respuesta 3 |
| D7 | PRO-006, portafolio | Trabajos anónimos por defecto. `trabajos.en_portafolio`, imagen, resumen público y `mostrar_cliente boolean default false` con fecha de autorización | Respuesta 5 |
| D8 | SEC-001, CSP | Nonces solo en las rutas con sesión (`/panel`, `/w`, `/login`, `/invitacion`) desde el middleware. La landing y el portal siguen estáticos con CSP en modo reporte | Un nonce obliga a renderizar en cada petición; la landing perdería `revalidate` |
| D9 | PER-001, Sentry en el navegador | Se mantiene, con `bundleSizeOptimizations` | Ya tiene DSN y recibe eventos |
| D10 | SEC-002, registro abierto | **No** activar la verificación de correo ni cerrar el registro: rompería las invitaciones (`src/lib/insforge/admin.ts:4-9` exige `requireEmailVerification = false`, y la invitación crea la cuenta con el registro público). Solo se desactiva OAuth y se sube el mínimo a 8 (A-05), y se registra si una cuenta existía antes de su invitación (T-21) | Corrige el quick win 6 de `99-plan-de-accion.md` |
| D11 | SEC-007, vistas del colaborador | **No** usar `security_invoker`. El colaborador no tiene políticas sobre `clientes` ni `trabajos` y solo los ve por las vistas `*_equipo`; con `security_invoker` dejaría de ver todo. En su lugar, un test que exija `cliente_asignado(` en toda vista de `public` (T-20) | Corrige la recomendación de `07-seguridad.md` |
| D12 | Toasts | `Toaster` sale del layout raíz y pasa a un componente de cliente que montan los layouts de panel, workspace, login, invitación y portal. La landing no usa toasts (`rg sonner src/components/landing` → vacío) | Saca sonner del primer HTML de la landing |

## 2. Tareas de Alejandro (consola y datos)

| ID | Qué | Dónde | Cómo se comprueba | Desbloquea |
|---|---|---|---|---|
| A-01 | Rotar la clave de API del proyecto y volver a vincular la CLI si la pide; revisar los 3 usuarios de producción | InsForge → Ajustes → General → Rotar; Auth → Users | La CLI responde con `npx insforge current`; todos los usuarios son reconocidos | SEC-010, SEC-008 |
| A-02 | Ruleset en `main`: exigir los checks `verificar` y `seguridad`, bloquear force-push, borrar ramas al fusionar. Decidir si además exige PR (recomendado: sí, el agente trabaja por rama) | GitHub → Settings → Rules | Un push con CI en rojo queda rechazado | DEV-001, regla 3 |
| A-03 | Sentry: activar "Prevent Storing of IP Addresses" y Data Scrubber; borrar los eventos de AGUEMAR-1 y resolverla; regla de alerta por correo para issues nuevas | Sentry → Settings → Security & Privacy; Alerts | Un reporte CSP nuevo llega sin IP | SEC-011, T-05 |
| A-04 | Monitor de uptime sobre `/`, `/login` y un `/d/<token>` de prueba, con aviso por correo o WhatsApp | UptimeRobot o Better Stack (gratis) | Llega el aviso al revocar el enlace de prueba | DEV-003 |
| A-05 | Auth de InsForge, en producción y staging: desactivar OAuth github y google; contraseña mínima 8. **No** activar la verificación de correo ni cerrar el registro (D10) | InsForge → Auth | `npx insforge metadata --json` muestra `oAuthProviders: []` y `passwordMinLength: 8` | SEC-002 |
| A-06 | Simulacro de restauración en una rama desechable, cronometrado; copia cifrada de `_respaldos/` fuera del equipo; borrar los volcados `sgtd-*` y `.env.local.bak-produccion` | CLI + README §Respaldos | README sin `[PENDIENTE: primer simulacro]`, con fecha y pasos | DEV-002, PM-002 |
| A-07 | Reescanear el asesor de producción; suprimir los `dangerous-function` con motivo "cubierto por tests/unit/migraciones.node.test.ts"; copiar los 41 de rendimiento a `docs/auditoria/advisor-rendimiento.md` para el agente; actualizar a v2.3.4, primero en staging | InsForge → Asesor; Ajustes → Versión | La lista de rendimiento está en el repo | DEV-008, PER-003 |
| A-08 | Activar Speed Insights si cabe en Hobby; anotar la región de las funciones | Vercel → Speed Insights; Settings → Functions | Primer dato de CWV de campo | PER-001, SEO-007 |
| A-09 | Datos del negocio: ciudad y distrito que se pueden publicar; correo del dominio para la landing (por ejemplo `hola@aguemar.com`); completar Mi marca en producción (responsable, teléfono, correo, dirección, RUC) | Chat con el agente + panel → Mi marca | El agente los usa en T-02b y T-03 | SEO-002, UX-001 |
| A-10 | Autorizar al agente a correr las pruebas API contra staging (`seguridad.spec.ts`, `equipo.spec.ts` y la nueva suite de T-23) con las cuentas `.test` de `.env.local` | Chat | Respuesta explícita | T-18, T-19, T-23 |
| A-11 | Tener `npm run dev` corriendo contra staging en una sesión de revisión al cerrar cada sprint | Su máquina | — | Todas las "falta pantalla" |
| A-12 | Aplicar en producción las migraciones de cada sprint, con el checklist de T-15 y un respaldo previo | CLI en el proyecto principal | `npm run db:status` igual en staging y producción | Sprint 2 y 4 |
| A-13 | Opcional: guardar el `CRON_SECRET` de staging como secreto `STAGING_CRON_SECRET` en GitHub, para que el CI también corra la prueba de recordatorios de pago (sin él se salta) | GitHub → Settings → Secrets and variables → Actions | El job `seguridad` ya no la salta | T-23 |
| A-14 | Abrir el PR de `actualizacion-post-auditoria` (enlace: https://github.com/aguemar-work/aguemar/pull/new/actualizacion-post-auditoria) y comprobar que pasan los tres jobs (`verificar`, `seguridad`, `e2e`). **Antes de fusionar, aplicar las 11 migraciones en producción (A-12)**: 6 del sprint 2 y 5 del sprint 4, en orden: el código nuevo consulta una columna que solo existe en staging. Después fusionar y abrir el PR de `next-16`. Cuando `e2e` lleve unas corridas estables, añadirlo a los checks requeridos de `main` | GitHub | Los tres checks en verde; `main` con las migraciones y el código | T-24, T-27 |
| A-15 | Probar a mano en producción el hallazgo abierto B-01 (abajo): abrir un trabajo en el panel lateral, añadir una etapa y ver si aparece sin recargar; abrir una empresa y encender o apagar un módulo; marcar una cotización como aceptada y ver si aparece «Registrar cobro». Si en producción real todo se actualiza, B-01 es solo de las pruebas; si no, es un defecto de la aplicación | aguemar.com (panel) | Resultado anotado aquí | B-01 |
| A-16 | Con tu `npm run dev` corriendo, probar a mano el sprint 4 y correr `npx playwright test tests/e2e/fase6.spec.ts` (esa prueba está en cuarentena contra `next start` por B-01 y no pude correrla): crear una cotización, enviarla, editarla (el aviso de «pasará a borrador v2»), reenviarla, aceptarla desde el panel (debe llegar la constancia por correo si Resend está activo), registrar un cobro de más (debe pedir confirmación), anular el cobro y anular la cotización | `npm run dev` + pantalla | Cada paso hace lo que dice la nota del sprint 4; fase6 en verde | T-28 … T-32 |
| A-17 | Probar en pantalla el flujo de la cotización del sprint 5 (con `npm run dev` contra staging, o en producción tras desplegar): crear una cotización eligiendo «+ Nueva empresa…» (debe abrirse el detalle con la empresa en la cabecera), enviarla (el diálogo dice a qué correo salió el aviso y tiene «Copiar enlace»), pulsar «Invitar a su espacio» (llega el correo de invitación y la empresa queda con el módulo Cotizaciones) y, tras «Marcar aceptada», ver que el mismo botón también activa Proyectos. Repetir A-15 (crear un trabajo) en producción | pantalla | Cada paso hace lo que dice la nota del sprint 5 · flujo; crear un trabajo ya no se queda en «Guardando…» | T-36 … T-39 |
| A-19 | Antes de fusionar `sprint5-workspace` en `main`: aplicar en producción las 2 migraciones del sprint 5 · workspace (`comentarios-cotizacion` y `ws-preferencias`) con el checklist del README (respaldo, `npm run db:migrate` con la CLI en el proyecto principal, `npm run db:status` igual que staging). El código de la rama llama a `ws_preferencias` y a `ws_comentar` con `cotizacion`; sin la migración, Mi cuenta falla y comentar una cotización devuelve «No encontramos ese elemento» | CLI en el proyecto principal | `db:status` sin pendientes; después fusión y despliegue | T-34, T-35 |
| A-18 | Empezar de cero en producción (decidido el 22/10: borrar lo operativo y conservar la configuración): con la CLI en el proyecto principal, `npm run db:reiniciar -- Project_AGUEMAR` (hace el respaldo antes), y borrar en InsForge → Auth → Users los usuarios de empresa que ya no se usan. Conviene hacerlo junto con A-12 (las 11 migraciones), en la misma sesión con el contexto en producción | CLI + InsForge → Auth | `/panel` sin empresas ni trabajos; Mi marca y Servicios intactos; la próxima cotización es COT-2026-001 | — |

## 3. Resumen de tareas del agente

| ID | Título | Hallazgos | Sprint | Migración | Pantalla | Depende de | Estado |
|---|---|---|---|---|---|---|---|
| T-01 | Contraste del formulario de contacto | A11Y-001 | 1 | No | Sí | — | Hecha · falta pantalla (`6edb6c4`) |
| T-02 | Metadatos de la landing: imagen en `/en`, JSON-LD limpio, título con ciudad | SEO-001, SEO-003, SEO-002 (etapa 1) | 1 | No | No | A-09 (solo 2b) | 2a hecha (`dddb62a`) · 2b bloqueada por A-09 |
| T-03 | Sin `[PENDIENTE]` en PDF, `/privacidad` y servicios; validador estricto; aviso de Mi marca | UX-001, COD-008 | 1 | No | Sí | — | Hecha · falta pantalla (`b5e88d9`) |
| T-04 | Mensajes de error genéricos con referencia y detalle a Sentry | COD-002, UX-009, SEC-004 | 1 | No | No | — | Hecha (`1975d13`) |
| T-05 | Cron y PDF reportan a Sentry | DEV-003, DEV-005 | 1 | No | No | — | Hecha (`98abd7b`) |
| T-06 | `exigirPropietario()` en todas las acciones solo-propietario + test estático | SEC-005, COD-007 | 1 | No | No | — | Hecha (`edc6250`) |
| T-07 | Peso de la landing: Sentry optimizado, Zod fuera del chunk común, Toaster por layout | PER-001, SEO-007 | 1 | No | Sí | — | Hecha · falta pantalla (`7ed2aae`) |
| T-08 | `solicitudes` en el perfil de acceso Soporte | PRO-005 | 1 | No | No | — | Hecha (`396cffe`) |
| T-09 | Obligatorios anunciados, objetivos de 32 px, toasts que no desaparecen | A11Y-002, A11Y-003, A11Y-004 | 1 | No | Sí | T-07 | Hecha · falta pantalla (`26d5192`) |
| T-10 | Calendario como tabla, `scroll-padding`, contrastes, skip link en el portal, `scope` | A11Y-005, 006, 008, 009 | 1 | No | Sí | — | Hecha · falta pantalla (`318db83`) |
| T-11 | `not-found.tsx` en panel y workspace; módulo inactivo explicado | UX-002 | 1 | No | Sí | — | Hecha · falta pantalla (`29f62e3`) |
| T-12 | Alertas del inicio que llegan filtradas | UX-004 | 1 | No | Sí | — | Hecha · falta pantalla (`7830140`) |
| T-13 | Ligadura "fi" en el texto de los PDF | UX-006 | 1 | No | No | — | Hecha (`0180bbd`) |
| T-14 | Mensaje de WhatsApp para la cotización aceptada | PRO-012 | 1 | No | Sí | — | Hecha · falta pantalla (`b93abb0`) |
| T-15 | Checklist de migración a producción y `CHANGELOG.md` | DEV-006, PM-003 | 1 | No | No | — | Hecha (`7907066`) |
| T-16 | `robots.txt` deja leer el `noindex` de `/d/` y `/login` | SEO-005 | 1 | No | No | — | Hecha (`0e80323`) |
| T-17 | Topes de `crear_lead` reordenados; tope global al respaldo | SEC-003 | 2 | **Sí** | No | — | Hecha en staging (`d48176b`) · falta producción (A-12) |
| T-18 | `ws_trabajos`, `ws_trabajo` y `ws_comentarios` comprueban el módulo | ARQ-006 | 2 | **Sí** | No | A-10 | Hecha en staging (`fca5d6d`) · falta producción (A-12) |
| T-19 | La empresa es la única que puede cambiar el texto de sus comentarios | SEC-006 | 2 | **Sí** | No | A-10 | Hecha en staging (`d59c4d4`) · falta producción (A-12) |
| T-20 | Test de inventario para las vistas de `public` | SEC-007 (D11) | 2 | No | No | — | Hecha (`8d1f452`) |
| T-21 | Marcar invitaciones aceptadas con una cuenta previa | SEC-002 (D10) | 2 | **Sí** | Sí | — | Hecha en staging · falta pantalla y producción (`3e849ca`) |
| T-22 | Retirar del árbol de migraciones la limpieza del sistema heredado | DEV-006, ARQ-004 | 2 | No (solo mover) | No | — | Hecha (`d0ff4ba`) |
| T-23 | Suite de pruebas de las funciones SQL críticas contra staging | QA-001 | 3 | No | No | A-10 | Hecha (`e773bb2`) · en CI con secreto opcional (A-13) |
| T-24 | e2e de navegador en CI con `next start`; guard `.test` en todos los specs | QA-002, DEV-004 | 3 | No | No | A-02 | Hecha en la rama (`d2f0fb5`, `3b8209a`, `cb88b90`) · falta ver el CI en un PR (A-14) |
| T-25 | Fixtures con limpieza, `retries: 1`, artefactos en CI | QA-003, QA-006 | 3 | No | No | T-24 | Hecha en parte (`3b8209a`): limpieza, guards, esperas y reintentos; 7 pruebas en cuarentena por el hallazgo abierto B-01 |
| T-26 | Fixture compartido de totales TS ↔ SQL | ARQ-002 | 3 | No | No | T-23 | Hecha (`076c50b`) |
| T-27 | Next 16 en rama aparte | ARQ-008, PM-006, SEC-009 | 3 | No | Sí | T-24 | Hecha en la rama `next-16` (`ab2dbc2`) · falta PR y revisión en pantalla (A-11, A-14) |
| T-28 | Una sola fuente de "pendiente de pago" | ARQ-001, PRO-011 | 4 | **Sí** | Sí | T-23 | Hecha (`e86bebb`) · migración `pendiente-unico`, solo en staging |
| T-29 | Versionado de la cotización enviada (D3) | PRO-001 | 4 | **Sí** | Sí | T-23, T-28 | Hecha (`7219dda`) · migración `cotizacion-version`, solo en staging |
| T-30 | Anular cotización aceptada y cobros (D4) | PRO-002 | 4 | **Sí** | Sí | T-28 | Hecha (`81519ea`) · migraciones `anulaciones-estado` y `anulaciones`, solo en staging |
| T-31 | Rótulo y correo de copia al aceptar (D5) | PRO-007 | 4 | No | Sí | T-29 | Hecha (`891a705`) · migración `aceptacion-origen`, solo en staging; la constancia por correo solo sale al registrar desde el panel |
| T-32 | Confirmación de cobro mayor que el pendiente (D2) | QA-008 | 4 | No | Sí | T-28 | Hecha (`b5e1432`) |
| T-33 | Envoltorio `accion()` que traduce y reporta | COD-001 | 4 | No | No | T-04 | Hecha (`1d69c43` … `f02816a`, un commit por módulo) |
| T-34 | "Mi cuenta" en el workspace | PRO-008 | 5 | **Sí** | Sí | — | Hecha · en producción desde v0.17.0 (22/10) con la migración `ws-preferencias` |
| T-35 | "Tengo dudas" en la cotización y respuesta en línea en la bandeja | UX-005, PRO-008 | 5 | **Sí** | Sí | T-18, T-29 | Hecha · en producción desde v0.17.0 (22/10) con la migración `comentarios-cotizacion` |
| T-36 | Crear con carga normal de página (`abrirCreado`) en los formularios de crear | B-01 | 5 · flujo | No | Sí | A-15 | Hecha (ver notas del sprint 5 · flujo) |
| T-37 | Empresa nueva desde la cotización | PRO-009 (D13) | 5 · flujo | No | Sí | T-36 | Hecha |
| T-38 | Diálogo de envío con enlace, correo y PDF a la vista | UX-005 (D13) | 5 · flujo | No | Sí | — | Hecha |
| T-39 | Invitar a la empresa a su espacio desde la cotización (al enviar o al aceptar) | PRO-008 (D13) | 5 · flujo | No | Sí | T-38 | Hecha |

**Sprint 1** son quick wins de código, sin migraciones, en ≈ 2–3 días de agente más una sesión de pantalla. **Sprint 2** son migraciones pequeñas. **Sprint 3** es la red de pruebas. **Sprint 4** son las cifras y la cotización. **Sprint 5** deja el workspace listo para invitar a los dos clientes actuales. Lo que sigue después está en §5.

## 4. Detalle de cada tarea

### Sprint 1 · Quick wins de código

**T-01 · Contraste del formulario de contacto** (A11Y-001)
- Archivo: `src/components/landing/formulario-contacto.tsx`.
- Cambio:
  - En la constante `CAMPO` (línea 22): `border-white/15` → `border-white/40`, `hover:border-white/30` → `hover:border-white/55` y `placeholder:text-white/35` → `placeholder:text-white/55`.
  - En el `className` del `<form>` (línea 83): `[&_p[id$=-ayuda]]:text-white/40` → `text-white/55`.
- Hecho cuando: el borde mide ≥ 3:1 y el placeholder y la ayuda ≥ 4,5:1 sobre `#0a0f1a`. Según la tabla de `06-accesibilidad.md` §5: blanco al 40 % da 3,81:1 y al 55 % da 6,23:1.
- Pantalla: el formulario en escritorio y a 360 px; el foco mint sigue visible.

**T-02 · Metadatos de la landing** (SEO-001, SEO-003, SEO-002 etapa 1)
- **2a, sin datos nuevos.**
  - `src/lib/landing-meta.ts`: añadir `images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: m.tituloCorto }]` en `openGraph` y en `twitter`.
  - `src/components/landing/pagina-landing.tsx:48-65`, JSON-LD:
    - quitar `inLanguage`;
    - `logo` e `image` → `${SITE}/opengraph-image`;
    - quitar `founder`;
    - incluir `email` solo si `marca.correo` termina en `@aguemar.com`.
  - Motivo del JSON-LD: `CLAUDE.md` fija que la landing no muestra datos personales del responsable.
- **2b, bloqueada por A-09.**
  - `src/lib/landing-textos.ts`: `meta.titulo` en ES y EN de ≤ 60 caracteres, con la ciudad y la intención. Ejemplo: "Desarrollo web y soporte técnico en {ciudad} | aguemar".
  - JSON-LD: `areaServed` con `City` y `Country`.
- Hecho cuando:
  - en el build de `.next-verify`, `server/app/en.html` contiene `og:image`;
  - el JSON-LD de `index.html` no tiene `inLanguage` ni `founder`;
  - un test en `tests/unit/landing.test.ts` comprueba que `metadataLanding("en").openGraph.images` existe;
  - el test de paridad de idiomas sigue verde.

**T-03 · Sin `[PENDIENTE]` visible** (UX-001, COD-008)
- Cambios:
  - `src/lib/pdf/base.tsx:186`: si `contacto` está vacío, no renderizar la línea.
  - `src/app/privacidad/page.tsx:34-37`:
    - `responsable` cae a `marca?.nombre_comercial ?? "aguemar"`;
    - las líneas de RUC y dirección solo se renderizan si hay dato;
    - `correo` cae al correo del dominio de A-09.
  - `src/app/panel/servicios/lista-servicios.tsx:104`: "[PENDIENTE]" → "A cotizar".
  - `src/lib/validators/marca.ts:18,22`: quitar las exenciones `v.startsWith("[PENDIENTE")`.
  - En `src/app/panel/page.tsx`, si Mi marca no tiene responsable, teléfono o correo, mostrar una alerta en tono `warn`: "Completa Mi marca: tus documentos salen sin contacto". Enlaza a `/panel/configuracion`.
- Hecho cuando: `rg -n '\[PENDIENTE' src` solo devuelve comentarios, y hay un test en `tests/unit/` donde `marcaSchema` rechaza `ruc: "[PENDIENTE: RUC]"`.
- Pantalla: la alerta del inicio y `/privacidad` con Mi marca incompleta en staging.

**T-04 · Errores genéricos con referencia** (COD-002, UX-009, SEC-004)
- Cambios:
  - `src/lib/insforge/errores.ts:84`: en vez de `No se pudo completar: ${e.message}`, generar `ref = crypto.randomUUID().slice(0, 6)`. Llamar `Sentry.captureException(e, { tags: { ref } })` y devolver "No se pudo completar. Inténtalo de nuevo; si sigue, escríbeme con la referencia {ref}."
  - `src/app/(auth)/acciones.ts`:
    - línea 56 → "No pudimos iniciar tu sesión. Inténtalo en unos minutos." + `captureException`;
    - líneas 115 y 197 → el mismo patrón;
    - línea 52 (el caso 403 de "correo no verificado") → el mismo mensaje que el 401. Con la verificación desactivada (D10) no debería ocurrir, y hoy confirma que la cuenta existe.
- Hecho cuando: `tests/unit/errores.test.ts` tiene un caso con un error desconocido cuyo `message` contiene "relation clientes", y el resultado no incluye "relation" pero sí "referencia". Los demás casos siguen verdes.

**T-05 · Cron y PDF a Sentry** (DEV-003, DEV-005)
- Cambios:
  - `src/app/api/cron/recordatorios/route.ts`:
    - en el `catch` (líneas 29-31), `Sentry.captureException(e, { tags: { tarea: "recordatorios" } })`;
    - en las respuestas 503 y 401, `Sentry.captureMessage("Cron de recordatorios: falta CRON_SECRET" | "secreto distinto", "warning")`;
    - opcional: envolver con `Sentry.withMonitor("recordatorios-pago", …, { schedule: { type: "crontab", value: "0 14 * * *" } })` si el plan de Sentry lo permite.
  - `src/lib/pdf/respuesta.ts:27`: `Sentry.captureException(e, { tags: { documento } })`. Así el mensaje "ya quedó registrado" pasa a ser cierto.
- Hecho cuando: `tests/unit/recordatorio-pago.node.test.ts`, con `vi.mock("@sentry/nextjs")`, comprueba que una excepción en `enviarRecordatoriosPago` llama a `captureException` y responde 500.

**T-06 · Acciones solo-propietario** (SEC-005, COD-007)
- Archivos y alcance:
  - todas las funciones exportadas de `src/app/panel/{clientes,servicios,leads,configuracion,cotizaciones,equipo,plantillas}/acciones.ts` (30 funciones; hoy 0 de 30 llaman a `exigirPropietario`);
  - las páginas de esos siete módulos ya empiezan con `soloPropietario()`.
- Cambio:
  - `await exigirPropietario();` como primera línea dentro del `try`;
  - `traducirError` ya convierte `SinPermisoError` en un mensaje legible (`errores.ts:40`);
  - borrar `eliminarComentario` de `src/app/panel/bandeja/acciones.ts:57` (exportada y sin UI).
- Hecho cuando: un test nuevo `tests/unit/acciones-propietario.node.test.ts` lee esos siete archivos y falla si alguna `export async function` no contiene `exigirPropietario()`. Mismo estilo que `migraciones.node.test.ts`.

**T-07 · Peso de la landing** (PER-001, SEO-007)
- Cambios:
  - `next.config.ts:49-56`: añadir a `withSentryConfig` `bundleSizeOptimizations: { excludeDebugStatements: true, excludeTracing: true, excludeReplayIframe: true, excludeReplayShadowDom: true, excludeReplayWorker: true }`.
  - `src/instrumentation-client.ts:2,7`: importar `config` desde el núcleo de Zod (`zod/v4/core`, comprobando que la versión instalada lo exporta) en lugar de `zod`.
  - D12: crear `src/components/avisos-toaster.tsx` (`"use client"`, con `<Toaster richColors position="top-center" closeButton duration={6000} />`). Quitar el `Toaster` de `src/app/layout.tsx:39` y montarlo en los layouts de `panel`, `w/[slug]`, `(auth)`, `invitacion` y `d/[token]` (si `d/[token]` no tiene layout, en su `page.tsx`).
  - Revisar por qué `index.html` carga el chunk de React Hook Form + Zod pese al `dynamic()` de `pagina-landing.tsx:24`. Si hace falta, envolver el formulario en un componente de cliente que lo cargue con `dynamic(…, { ssr: false })`.
- Hecho cuando, en el build de `.next-verify`:
  - el First Load de `/` baja de 242 kB (objetivo ≤ 200 kB);
  - `rg -c "new Function|eval\(" .next-verify/static/chunks` sigue en 0;
  - `index.html` ya no referencia sonner.
- Anota las cifras antes y después en el commit.
- Pantalla: el formulario sigue enviando y mostrando el éxito.

**T-08 · Perfil Soporte con solicitudes** (PRO-005)
- Archivo: `src/lib/invitaciones.ts:22-28`.
- Cambio: `modulos: ["documentos", "cotizaciones", "equipos", "solicitudes"]`; descripción: "Cotización, fichas técnicas, equipos, cobros y pedidos de soporte."
- Hecho cuando: `tests/unit/invitaciones.test.ts` cubre el perfil nuevo y `perfilDeModulos` lo reconoce.
- Nota: las empresas ya configuradas con el perfil anterior pasan a "personalizado". Hoy no hay ninguna activa (respuesta 1).

**T-09 · Formularios y diálogos accesibles** (A11Y-002, A11Y-003, A11Y-004)
- Cambios:
  - `src/components/formulario/campo.tsx`: `propsCampo(id, error, ayuda, requerido?)` devuelve también `"aria-required": requerido || undefined`. En cada `<Campo requerido>` (`rg -l "requerido" src --glob '*.tsx'`), pasar `true` también a `propsCampo` del control.
  - `src/components/ui/sheet.tsx:56` y `dialog.tsx:28`: el botón de cerrar pasa de `absolute right-4 top-4 rounded-sm` a `absolute right-2 top-2 rounded-md p-2` (32 px).
  - `src/components/calendario/vistas.tsx:92`: "+" de `p-0.5` a `p-1.5`; pastillas de `py-0.5` a `py-1` con `space-y-1`.
  - Errores persistentes: en los `toast.error(` de acciones que guardan datos, `{ duration: 10000 }`. El `closeButton` ya viene de T-07.
- Hecho cuando: un test con Testing Library (ya instalado, jsdom configurado) renderiza `Campo` + `Input` con `requerido` y encuentra `aria-required="true"`.
- Pantalla: cerrar el panel lateral en móvil con el dedo.

**T-10 · Pequeños de accesibilidad** (A11Y-005, 006, 008, 009)
- `src/components/calendario/vistas.tsx:61-80`: `role="grid" | "row" | "columnheader" | "gridcell"` → `table | row | columnheader | cell`.
- `src/app/globals.css`, dentro de `@layer base`: `html { scroll-padding-top: 4.5rem; }`.
- En el contenedor con scroll de `src/components/panel/panel-lateral.tsx:58`: `scroll-pb-24`.
- `vistas.tsx:86`: `text-muted-foreground/60` → `/80`.
- `src/app/d/[token]/page.tsx` (`Marco`, cerca de la línea 151): `<SaltarContenido />`.
- `src/components/ui/table.tsx:32`: `scope="col"` por defecto en `TableHead`.
- `sheet.tsx:30`, `dialog.tsx:22`, `dropdown-menu.tsx:24`: `motion-reduce:animate-none`.
- Hecho cuando: typecheck, lint y tests verdes; `rg 'role="grid"' src` → 0.
- Pantalla: tabular hacia atrás en un formulario largo del panel lateral y comprobar que el foco no queda bajo la topbar.

**T-11 · 404 con marco** (UX-002)
- Crear `src/app/panel/not-found.tsx` y `src/app/w/[slug]/not-found.tsx` con `EmptyState`:
  - panel: "No encontramos esto. Puede que se haya eliminado." y botón "Volver al inicio";
  - workspace: "Esto no está disponible en tu espacio. Si lo necesitas, escríbenos." con el WhatsApp de `ws_mi_empresa()`/marca, si el layout lo tiene a mano.
- Hecho cuando: typecheck y lint verdes.
- Pantalla: abrir un trabajo inexistente en el panel y un módulo inactivo en el workspace; ambos conservan la barra lateral. Revisar también dentro del panel lateral `@modal`.

**T-12 · Alertas del inicio filtradas** (UX-004)
- Cambios:
  - `src/app/panel/page.tsx:42-44`: enlaces a `/panel/trabajos?foco=vencidas`, `?foco=semana` y `?foco=tareas_vencidas`.
  - `src/app/panel/trabajos/page.tsx:23`: leer `foco` y pasarlo a `listarTrabajos`.
  - `src/lib/datos/trabajos.ts:20-34`: `vencidas` = `fecha_compromiso < hoy (Lima)` y estado activo; `semana` = entre hoy y +7 días; `tareas_vencidas` = trabajos con alguna `trabajo_tareas` no hecha y `fecha_limite < hoy`. Para la última, filtrar en memoria sobre lo ya traído o con un `in` sobre ids.
  - Mostrar un chip "Filtro: … ×" que quita el parámetro.
- Hecho cuando: un test unitario de la función que traduce `foco` a filtros.
- Pantalla: los números del inicio coinciden con la lista filtrada.

**T-13 · Ligadura "fi" en PDF** (UX-006)
- Archivo: `src/lib/pdf/base.tsx:18-33,83-90`.
- Cambio: aplicar a Sora la misma desactivación de ligaduras que ya usa JetBrains Mono (`fontFeatureSettings`), en el estilo base de la página.
- Hecho cuando: `GUARDAR_PDF=<carpeta del scratchpad> npx vitest run tests/unit/pdf-*` genera los PDF. Al copiar texto de ficha.pdf desde un visor sale "Office" y "verificó".
- Si se acepta añadir `pdf-parse` como devDependency, convertir esa comprobación en test. Pedir el OK antes de añadir la dependencia.

**T-14 · WhatsApp de la cotización aceptada** (PRO-012)
- Cambios:
  - `src/app/panel/cotizaciones/[id]/acciones-cotizacion.tsx`:
    - añadir a `Props` `estado` (ya está) y `aceptacion: { nombre: string; fecha: string; registradaPor: string } | null`, que viene de `c.aceptaciones[0]` en `detalle.tsx:31`;
    - extraer el armado del texto (líneas 236-241) a `src/lib/cotizacion.ts` como `mensajeWhatsAppCotizacion(datos)`;
    - si `estado === "aceptada"`: "Hola {nombre}, te confirmo la cotización {numero} ({asunto}) por {total}, aceptada el {fecha}. Te adjunto el PDF de lo aceptado{; también la ves aquí: enlace del portal o del workspace}." El botón de PDF del diálogo pasa a "Descargar PDF aceptado";
    - en `DialogoAceptar`, tras aceptar con éxito, abrir el diálogo de mensaje.
- Hecho cuando: un test unitario de `mensajeWhatsAppCotizacion` cubre enviada con workspace, enviada con token, sin token y aceptada.
- Pantalla: marcar aceptada en staging y abrir WhatsApp.

**T-15 · Checklist de migración y changelog** (DEV-006, PM-003)
- `README.md`, sección "Base de datos", paso 5: sustituir la línea única por un checklist marcable:
  1. Respaldo con `npm run db:respaldo` y respaldo manual de InsForge.
  2. `branch switch --parent` y `npm run db:migrate`.
  3. `npm run db:status` igual que staging.
  4. Volver a staging.
  5. Deploy.
  6. Smoke test de `/`, `/login` y `/d/<token>`.
  7. Nota en `CHANGELOG.md`.
- Crear `CHANGELOG.md` con la entrada de esta auditoría y la regla "una entrada por despliegue que lleve migración, con su tag `vX.Y.Z`".
- Hecho cuando: el README y el changelog existen y `CLAUDE.md` los menciona en "Despliegue y entornos".

**T-16 · robots** (SEO-005)
- `src/app/robots.ts:7`: quitar `"/d/"` y `"/login"` del `disallow`.
- `next.config.ts` `headers()`: añadir `{ source: "/d/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }` y lo mismo para `/login`.
- Hecho cuando: un test unitario de `robots()` comprueba que `/panel` sigue bloqueado y `/d/` no.

### Notas del sprint 1 (21/10/2026)

Cambios respecto a lo escrito en §4, ya incorporados en el código:

- **T-05:** el 401 del cron solo se reporta a Sentry si la llamada viene de Vercel Cron (agente `vercel-cron`). Si no, cualquiera que pruebe la URL llenaría Sentry.
- **T-07:** importar `config` desde `zod/v4/core` seguía metiendo el núcleo de Zod en el chunk común, y reexportar `z` desde un módulo propio sumaba los textos en otros idiomas. Quedó `src/lib/zod-sin-jit.ts`, importado solo por su efecto en validadores, `env.ts` y `diagnostico.ts`. El formulario de contacto se carga en el navegador con `dynamic(…, { ssr: false })` desde `formulario-diferido.tsx`, porque desde un Server Component igual entraba en la carga inicial. Resultado: landing de 242 a 164 kB, compartido de 174 a 141 kB.
- **T-09:** en vez de pasar `requerido` a `propsCampo` en cada formulario, `Campo` le pone `aria-required` a su control, así cubre todos. Los errores pasan por `avisoError()` (`src/lib/avisos.ts`, 10 s) en vez de editar cada llamada. Se configuró `jest-dom` (`tests/setup-dom.ts`) para el primer test de componente.
- **T-14:** el botón "Descargar PDF" del diálogo de WhatsApp se muestra siempre, no solo sin workspace (respuesta 4: la cotización siempre va en PDF).
- **T-15:** se corrigió en `CLAUDE.md` la frase "despliega tras pasar CI", que no es cierta mientras `main` no exija los checks.

**Revisión en pantalla pendiente** (A-11), con `npm run dev` contra staging:
- landing (formulario, contraste y envío);
- `/privacidad` con Mi marca incompleta;
- aviso de Mi marca en el inicio;
- avisos en panel, workspace y portal;
- cerrar el panel lateral en móvil;
- calendario mes;
- foco al tabular hacia atrás en el panel lateral;
- 404 de un trabajo inexistente (también en el panel lateral) y de un módulo inactivo;
- cifras de las alertas frente a la lista filtrada;
- marcar una cotización aceptada y abrir WhatsApp.

### Sprint 2 · Migraciones pequeñas

El agente las aplica en staging y Alejandro en producción (A-12).

**T-17 · Topes de `crear_lead`** (SEC-003, D1)
- Migración `lead-topes`: `create or replace function public.crear_lead(...)`, igual a `db/funciones/crear_lead.sql`, pero:
  - el bloque del tope por IP va **antes** del global;
  - el global usa `errcode = '53300'` y el mensaje "Demasiados envíos en este momento.".
- App, `src/app/acciones.ts:83-86`:
  - si `error.code === "53300"` → `return respaldo("tope global de leads")`;
  - el regex `/demasiados/i` queda solo para el tope por IP. Su mensaje sigue igual.
- Hecho cuando:
  - `npm run db:funciones` deja `db/funciones/crear_lead.sql` actualizado;
  - `tests/unit/migraciones.node.test.ts` está verde;
  - `tests/unit/respaldo-lead.node.test.ts` tiene un caso nuevo: rpc con `{ code: "53300" }` llama a `respaldarLead` y responde éxito.

**T-18 · Módulo en `ws_trabajos`, `ws_trabajo` y `ws_comentarios`** (ARQ-006)
- Migración `ws-modulos`:
  - `ws_trabajos` y `ws_trabajo`: añadir `and public.ws_modulo_activo('proyectos')` al `where`;
  - `ws_comentarios`: `and public.ws_modulo_activo(case p_entidad when 'trabajo' then 'proyectos' when 'actividad' then 'calendario' when 'informe' then 'informes' when 'documento' then 'documentos' when 'cotizacion' then 'cotizaciones' end)`;
  - conservar `security definer`, `search_path` y los `grant` actuales.
- Hecho cuando: hay un caso nuevo en `tests/e2e/seguridad.spec.ts` (con Proyectos desactivado, `ws_trabajos` devuelve `[]`, restaurando el módulo al final). Se corre contra staging solo con A-10.

**T-19 · Texto de los comentarios de la empresa** (SEC-006)
- Migración `comentarios-autor`: trigger `before update` en `public.comentarios` (función `comentarios_proteger_texto`, `security invoker`). Si `old.es_propietario = false` y `current_user in ('authenticated','anon')`, la fila solo puede cambiar `leido`; cualquier otra columna distinta lanza `42501` "Solo la empresa puede cambiar lo que escribió".
- Los `ws_*` corren como dueño de la función, así que no se ven afectados.
- Hecho cuando: hay un caso nuevo en `seguridad.spec.ts` (el propietario intenta cambiar el texto de un comentario de la empresa A y falla; marcar `leido` funciona). Requiere A-10.

**T-20 · Inventario de vistas** (SEC-007, D11)
- `tests/unit/migraciones.node.test.ts`: leer las sentencias `create (or replace) view public.*` vigentes y exigir que cada una contenga `cliente_asignado(` o figure en una lista blanca explícita.
- Hecho cuando: el test pasa con `clientes_equipo` y `trabajos_equipo` y falla si se añade una vista sin filtro. Para comprobarlo, probar con una cadena de ejemplo dentro del test.

**T-21 · Cuenta previa a la invitación** (SEC-002, D10)
- Migración `invitacion-cuenta-previa`:
  - `invitaciones.cuenta_previa boolean`;
  - en `invitacion_aceptar`, guardar `(select created_at from auth.users where id = auth.uid()) < i.created_at`.
- App: en la ficha de la empresa (`src/app/panel/clientes/[id]/acceso.tsx`) y en Equipo, si `cuenta_previa`, mostrar el aviso "Esta cuenta existía antes de la invitación: confirma con la persona que la creó ella".
- Hecho cuando: test de inventario verde; aviso visible en pantalla con una cuenta de staging creada antes de invitarla.

**T-22 · Limpieza heredada fuera de la cadena** (DEV-006, ARQ-004)
- **No mover** `migrations/20261013171105_limpiar-esquema-sgtd.sql`: está registrada como aplicada y moverla rompería el historial de la CLI.
- En su lugar:
  - añadir al inicio del archivo un comentario que explique que es una limpieza única del sistema SGTD y no hace nada en una base nueva (todo es `if exists`);
  - en `README.md`, anotar que una base nueva desde cero ejecuta esos `DROP ... IF EXISTS` sin efecto.
- Hecho cuando: el comentario y la nota existen. Es la única tarea de este sprint sin cambio de esquema.

### Notas del sprint 2 (21/10/2026)

Las migraciones se aplicaron **solo en staging**; producción espera a A-12. Las pruebas API (`seguridad.spec.ts` y `equipo.spec.ts`) pasan contra staging: 29 casos.

**Hallazgo al probar T-17 (cambió lo planeado).** InsForge entrega con su mensaje únicamente los errores `P0001`, `P0002`, de la clase `22` y `42501`; cualquier otro código (la clase `53`, otros `P0xxx`) llega como el texto "Something went wrong", sin código ni mensaje. El tope por IP de `crear_lead` usaba `53400`, así que **nunca rechazaba**: la app lo trataba como falla de la base y mandaba el mensaje por el respaldo de correo. La decisión D1 se mantiene (sin clave de servicio, tope por IP primero, tope global al respaldo), pero los dos topes ahora son `P0001` y se distinguen por `hint` (`tope_ip`, `tope_global`). Por haberlo descubierto con las dos primeras versiones ya aplicadas en staging, quedaron **tres migraciones** (`lead-topes`, `lead-topes-codigos`, `lead-topes-hint`); la última es la definitiva y producción recibirá las tres en orden. La regla quedó en `CLAUDE.md` y en el README.

- **T-18:** `ws_comentarios` también exige el módulo de la entidad. Test con la empresa B: comenta con el módulo activo, lo desactiva, y lista, detalle y comentarios quedan vacíos.
- **T-19:** el trigger bloquea cualquier cambio salvo `leido` en comentarios de la empresa. El código publicado solo cambia `leido` y borra comentarios (el trigger no bloquea borrados), así que es compatible.
- **T-20:** el test lee las vistas vigentes de `migrations/`. `security_invoker` queda descartado (D11).
- **T-21:** el aviso sale en la ficha de la empresa y en la tarjeta del colaborador. Las invitaciones ya aceptadas quedan en `false` (no hay forma fiable de reconstruirlo). El test usa una cuenta de prueba fija anterior a la invitación y otra nueva por corrida: **las cuentas de Auth no se pueden borrar por la API**, así que cada corrida deja una cuenta `e2e-nueva-…` en staging.
- **T-22:** no se editó la migración heredada (ya aplicada); solo se documentó. Todos sus `DROP` llevan `IF EXISTS`.

**Orden en producción (A-12).** El código nuevo ya depende de la migración `invitacion-cuenta-previa`: la ficha de la empresa consulta `invitaciones.cuenta_previa`, y sin la columna fallaría. Por eso el checklist del README va en este orden: migrar producción primero, desplegar después. Las otras cinco son compatibles con el código publicado.

**Revisión en pantalla pendiente (A-11):** el aviso de cuenta previa en la ficha de una empresa con acceso y en Equipo (necesita una invitación aceptada con cuenta previa en staging).

### Notas del sprint 3 (en curso, 21/10/2026)

**Hechas: T-23 y T-26.** T-24, T-25 y T-27 esperan a que se confirme la protección de `main` (A-02) y, T-27, la revisión en pantalla.

- **T-23:** `tests/e2e/db.spec.ts` con siete casos (seis de T-23 y el de paridad de T-26), solo staging y cuentas `.test`. Reutiliza dos empresas fijas (`e2e-db-deuda`, `e2e-db-modulos`) y cuentas fijas con contraseña derivada de `E2E_PASSWORD`, porque lo aceptado no se borra y las cuentas de Auth tampoco: cada corrida deja **una cotización aceptada** (la de la aceptación doble). Lo demás se borra al terminar.
- **Recordatorios (cambió lo planeado).** Una cotización recién aceptada no puede ser candidata a recordatorio el mismo día y la fecha de aceptación no se puede falsear. La prueba toma una cotización aceptada antes de hoy, le ajusta el plazo hasta encontrar una combinación (tipo, vencimiento) que no se haya tomado nunca, comprueba que la segunda toma no la repite y restaura plazo y recordatorio. Si todas se aceptaron hoy, anota en el informe que solo comprobó la clave y que repetir no entrega nada.
- **T-26 encontró un error real.** `cantidad 1,005 × S/ 1,00` daba 100 céntimos en la vista previa del formulario y 101 en la base (coma flotante frente a decimales exactos). Corregido en `importeLinea` con aritmética entera. El fixture `tests/fixtures/cotizaciones.json` tiene nueve casos y lo recorren los dos lados.
- **Cuentas de Auth huérfanas en staging:** `e2e-cuenta-previa` (con la contraseña antigua escrita en el repo, ya retirada) queda sin uso; la cuenta fija de T-21 pasó a `e2e-previa-fija`.

### Notas del sprint 3, cierre (21/10/2026)

**Hechas:** T-23 y T-26 (arriba), T-24, T-25 y T-27. Cuatro ramas de trabajo: `actualizacion-post-auditoria` (33 commits sobre `main`, subida, sin PR) y `next-16` (un commit más, subida). `main` no se tocó.

- **T-24 encontró un defecto real de la aplicación (arreglado).** Al correr por primera vez las pruebas de navegador contra un build de producción (`next start`), los clics en enlaces que abren una ficha en el panel lateral a veces no hacían nada: la petición del router terminaba bien (200) pero la navegación no se confirmaba. Con una misma prueba de seis sesiones: con precarga de enlaces, 2 de 6 abrían la ficha; sin precarga, 6 de 6. Ocurre igual en `origin/main` (se comprobó compilando ese commit en un árbol aparte), así que no es una regresión. Arreglo: componente `Enlace` (`next/link` con `prefetch` en `false`) en los 34 archivos del panel. Es probable que un usuario real lo haya sufrido si hacía clic enseguida tras cargar una lista.
- **B-01, hallazgo abierto (no resuelto).** En el mismo build de producción, cinco flujos del panel lateral fallan porque la pantalla **no se actualiza después de la acción del servidor**: añadir una etapa, encender o apagar un módulo, marcar una tarea, aceptar una cotización y registrar un cobro, agendar una actividad. La acción responde 200 y el cambio queda en la base, pero la ficha sigue mostrando lo anterior. En la traza, la acción sale con la cabecera `Next-Url: /panel` en lugar de la ruta desde la que se abrió el panel. Fallan igual en `origin/main` y con Next 16; pasan con `npm run dev`. Un `router.refresh()` extra en el interruptor de módulos no lo arregla, así que no es un olvido de refresco. No se sabe si pasa en la aplicación real; A-15 lo comprueba a mano. Mientras tanto esas pruebas están en cuarentena **solo contra `next start`** (`test.fixme(EN_PRODUCCION, …)`, `tests/e2e/esperas.ts`) y siguen corriendo contra `npm run dev`. Propuesta de investigación aparte: reproducir con un caso mínimo, probar `Next-Url` y `revalidatePath` en rutas interceptadas, y mirar si lo corrige una versión posterior de Next.
- **A-15 hecha en producción con Claude (22/10/2026, aguemar.com, el código desplegado de `main`).** Con una empresa de prueba «ZZ Prueba A-15» (borrada al terminar, junto con sus trabajos y actividad), sesión iniciada por Alejandro en el navegador integrado y respuestas de acción de ~31 KB (6,5 KB comprimidas):
  - **Funcionan, sin un solo fallo:** encender y apagar un módulo (8 de 8, el interruptor vuelve a habilitarse en 0,3–1,2 s), añadir etapas (6 de 6, aparecen en 0,4–1,3 s), añadir tareas (6 de 6), marcar tareas (lo marcado quedó guardado tras recargar) y agendar una actividad (2 s, la pantalla avanza).
  - **Falla, 2 de 2:** **crear un trabajo** desde `/panel/trabajos/nuevo`. El trabajo se crea en la base, pero el botón se queda en «Guardando…» más de 17 s y no navega al detalle (hasta recargar). Es el mismo síntoma de B-01, así que **el defecto existe en producción real**, aunque no en todos los flujos. La diferencia con los que funcionan: aquí la acción termina con `router.push` a una página grande (el detalle del trabajo); la actividad, que también navega, va a una página más ligera.
  - **No probado:** aceptar una cotización (una aceptada no se puede borrar y todavía no hay anulación en producción). Un intento intermedio de crear el trabajo quedó inválido (la página saltó a la portada por sí sola) y no cuenta.
  - **Consecuencia:** B-01 no es solo de las pruebas. Decisión pendiente de Alejandro: tratar «crear con redirección» (trabajo, y por semejanza empresa, cotización, ficha, informe) para que la acción devuelva el id y la navegación no dependa de la respuesta grande. **Decidido el 22/10 (T-36):** al crear, el detalle se abre con una carga normal de página (`abrirCreado`).
- **T-25.** Hecho: barrido de restos al empezar (`globalSetup`) y borrado por sufijo al terminar cada archivo (`afterAll`, corre aunque falle un test intermedio), guard de cuentas `.test` en fase2 a fase9, restauración de los módulos de SGC, `retries: 1` y un worker en CI, informe HTML y espera de hidratación (marca `data-hidratado` más `networkidle`; una sola señal no basta). Corregidos dos selectores que ya no eran únicos (`getByLabel("Empresa")` coincidía con la lista del menú) y el clic forzado de `fase6`. Resultado local, dos corridas seguidas: 33 pasan y 7 en cuarentena u omitidas, ~2,4 min. Falta el fixture con aislamiento por prueba y cuentas separadas por archivo: sigue habiendo una cuenta del propietario compartida y SGC.
- **T-27.** Next 16.4.2 con Turbopack: build en 19 s (antes 66 s), mismo resultado en las pruebas de navegador y los PDF se generan. `npm audit --omit=dev`: de 2 vulnerabilidades a **0**; la auditoría del CI ya no es informativa. `middleware.ts` pasó a `proxy.ts`; `eslint-config-next` 16 trajo reglas nuevas de React que señalaron 4 errores reales en código existente (se corrigieron) y 10 avisos de `react-hook-form` (se apagan, no usamos el compilador de React). Quedan 5 avisos de `npm audit` solo de herramientas de desarrollo (`braces`), sin arreglo disponible.
- **CI.** Job `e2e` nuevo (build con staging, `next start`, Chromium, un worker; sube informe y trazas si falla), ejecución nocturna a las 02:00 de Lima, caché de compilación y `permissions: contents: read`. Hasta que exista el PR (A-14) no se ha visto correr en GitHub: se probó el mismo flujo en local.
- **Pendiente de T-23/T-26 en CI:** el secreto opcional `STAGING_CRON_SECRET` (A-13).

### Notas del sprint 4, cierre (21/10/2026)

**Hechas:** T-28, T-29, T-30, T-31, T-32 y T-33, en `actualizacion-post-auditoria` (22 commits nuevos). **5 migraciones nuevas, aplicadas solo en staging** (con las 6 del sprint 2 son 11 por aplicar en producción, en orden de nombre): `pendiente-unico`, `cotizacion-version`, `anulaciones-estado`, `anulaciones` y `aceptacion-origen`. `anulaciones-estado` va aparte porque un valor nuevo de un enum no se puede usar en la transacción que lo crea.

- **T-28 · un solo pendiente.** `cotizacion_json_vivo` expone `pendiente`, `vence_pago` y `atraso_dias` desde `deudas_cotizacion()`; el detalle del panel, `ws_cotizacion` y el portal lo leen de ahí, y la ficha de empresa y el inicio del workspace suman los soles que salen de la misma función (`total_pendiente` en `ws_cotizaciones`). Lo que se congela al aceptar no los lleva: las huellas guardadas siguen valiendo. Caso nuevo en `db.spec.ts`: mismo pendiente en deudas, panel, workspace y portal con un cobro suelto de por medio. Queda fuera `panel_resumen` (su saldo por empresa sigue siendo aceptado menos cobrado) y el cron, que ya usaba `deudas_cotizacion()`.
- **T-29 · versionado.** Al pasar a `enviada` se congela una copia con su huella (`enviada_documento`, `enviada_huella`, `version`). Workspace y portal muestran la copia; aceptar acepta esa copia y se rechaza si lo guardado cambió. Editar una enviada (cabecera o líneas) descarta la copia, sube la versión y la devuelve a borrador; el formulario avisa antes. El PDF, la vista y el detalle muestran `v{n} · {huella:8}`. Una cotización insertada ya como `enviada` por la API no tiene copia (se acepta con el contenido del momento, como antes): el flujo de la app siempre pasa por borrador.
- **T-30 · anular.** Estado `anulada` solo desde `aceptada` (función `cotizacion_anular`, solo propietario, con motivo); la aceptación queda intacta y la cotización anulada no se edita, borra ni acepta. Los cobros se anulan con motivo (`anulado_en`, `anulado_motivo`), quedan tachados y no cuentan en deudas, resumen ni workspace; un cobro anulado no se cambia ni se borra. **Decisión que tomé:** un cobro no anulado ligado a una cotización anulada pasa a ser saldo a favor de la empresa (paga sus otras deudas por FIFO); el diálogo de anulación lo avisa. `eliminarCobro` desaparece (`anularCobro`). Al cancelar un trabajo cuya cotización sigue aceptada, un aviso lleva a anularla. **Pendiente de decidir:** los cobros todavía se pueden borrar por la API si no están anulados (los tests lo usan para limpiar).
- **T-31 · rótulo y constancia.** La aceptación expone `por` y todas las pantallas y el PDF dicen «Aceptada por … el … · desde su espacio | por enlace | registrada por aguemar». La empresa recibe una constancia por correo con el código de versión **solo cuando aguemar registra la aceptación desde el panel**: las sesiones de la empresa y del portal no pueden leer su correo (no hay clave de servicio) y quien aceptó ya ve la confirmación en pantalla.
- **T-32.** El formulario de cobros pide confirmación si un cobro ligado se pasa de lo pendiente (`excesoDeCobro`, con test).
- **T-33 · `accion()`.** Los 164 `return fallo(traducirError…` de `src/app` pasaron a `accion("módulo.función", …)` (un commit por módulo) o a `falloDe(error, acción)` en las acciones sin `try` (portal, invitación, workspace, landing, y dos ayudantes). El error inesperado llega a Sentry con la etiqueta `accion`. `rg -c "return fallo\(traducirError" src/app` da 0. Ninguna acción con `redirect()` quedó dentro de un `accion()`.
- **Cambio al margen:** `eslint.config.mjs` ignora `.claude/` (los worktrees de las sesiones dejaban `npm run lint` con miles de falsos errores).
- **Verificación.** Unit 204 pasan; las pruebas de API contra staging (`db`, `seguridad`, `equipo`) pasan, con 3 casos nuevos en `db.spec.ts` (pendiente único, versionado y anulación). **No pude verificar en pantalla** el diálogo de anulación, el de anular cobro ni el aviso de edición: las pruebas de navegador que los tocan están en cuarentena contra `next start` (B-01) y yo no arranco `npm run dev`. De ahí A-16.
- **Pruebas de navegador contra un build de producción** (`next start`, un worker): 101 pasan, 53 omitidas (cuarentena de B-01 y proyecto móvil) y **1 falló**: `fase3 · crea un trabajo` se quedó en «Guardando…» (la acción no volvía), el mismo síntoma de B-01. La repetí para saber si lo provoqué: en el build del sprint 4 falló 3 de 18 veces, y 0 de 22 en el commit anterior (`3fb4a59`, compilado aparte), pero las tres últimas tandas limpias, sin otra sesión usando el mismo staging y la misma cuenta, dieron 16 de 16 en ambos. Lo más probable es que sea B-01 agravado por la carga de la máquina, no una regresión; no lo puedo demostrar con certeza y queda anotado para cuando B-01 se cierre.

### Sprint 3 · Red de pruebas

**T-23 · Suite de funciones SQL críticas** (QA-001)
- Nuevo `tests/e2e/db.spec.ts`, solo API, mismo arranque y guard `.test` que `seguridad.spec.ts:29`. Casos:
  1. Dos `aceptar_cotizacion` en paralelo (`Promise.all`) sobre la misma cotización: una acepta, la otra devuelve "ya aceptada", y queda una sola fila en `aceptaciones` y un solo trabajo.
  2. Diez inserciones concurrentes de fichas: diez números `FT-AAAA-NNN` distintos y consecutivos.
  3. `deudas_cotizacion` con dos cotizaciones aceptadas y un cobro suelto: el cobro paga primero la que vence antes.
  4. `cobro_recordatorios_tomar` dos veces el mismo día: la segunda devuelve vacío.
  5. `cobro_recordatorios_tomar('clave-mala')`: devuelve error.
  6. Invitación usada, vencida y revocada: `invitacion_aceptar` falla con mensaje en español.
  7. `ws_solicitar` con el módulo Solicitudes desactivado: falla.
  8. `ws_mi_empresa` con `clientes.activa = false`: devuelve null.
- Cada caso crea lo suyo con el prefijo `E2E-db-{fecha}` y lo limpia en `afterAll` (lo aceptado no se borra: queda marcado con el prefijo).
- Añadirlo al job `seguridad` de `.github/workflows/ci.yml:77`.
- Hecho cuando: corre verde contra staging (requiere A-10) y en CI.

**T-24 · e2e de navegador en CI** (QA-002, DEV-004)
- `playwright.config.ts`: `webServer` solo si `PLAYWRIGHT_WEBSERVER=1` (`command: "npx next start -p 3000"`, `url: "http://localhost:3000"`), para que en local siga usándose el servidor de Alejandro.
- `ci.yml`: job `e2e` que reutiliza el build, instala `npx playwright install --with-deps chromium`, corre con `--project escritorio` contra staging en `pull_request` y en `schedule` nocturno, y sube `test-results/` con `actions/upload-artifact` si falla.
- Añadir `actions/cache` de `.next/cache` al job `verificar` y `permissions: { contents: read }` al workflow.
- Guard `.test` (como `seguridad.spec.ts:29`) en todos los `fase*.spec.ts`.
- Hecho cuando: el job corre verde en un PR. Los secretos ya están en GitHub (el job `seguridad` corrió con ellos).

**T-25 · Fixtures y configuración de Playwright** (QA-003, QA-006)
- Fixture `test.extend` en `tests/e2e/fixtures.ts` que cree empresa y trabajo con prefijo por corrida y los borre en el teardown aunque el test falle.
- `retries: 1` en CI; `workers: 1` para los specs con sesión.
- Sustituir la espera `networkidle` de `tests/e2e/esperas.ts:17-19` por una espera explícita del control y quitar `force: true` de `fase6.spec.ts:71-72`.
- Hecho cuando: dos corridas seguidas verdes sin datos huérfanos en staging (consulta `like 'E2E%'`).

**T-26 · Paridad de totales** (ARQ-002)
- `tests/fixtures/cotizaciones.json` con 6 casos: IGV sumado e incluido, descuento, redondeo en .5, línea en cero y 40 ítems, con totales esperados.
- `tests/unit/cotizacion.test.ts` los recorre con `src/lib/cotizacion.ts`; T-23 los inserta en staging y compara con los totales de los triggers.
- Hecho cuando: ambos lados pasan con el mismo fixture.

**T-27 · Next 16** (ARQ-008, PM-006, SEC-009)
- Rama `next-16`: subir `next` y `eslint-config-next` a 16.x (PR #5 y #6 de Dependabot); renombrar `src/middleware.ts` → `src/proxy.ts` con el mismo matcher; build en `.next-verify`; tests PDF; e2e con T-24.
- Cuando `npm audit --omit=dev` quede limpio, quitar `continue-on-error` de `ci.yml:39`.
- Hecho cuando: PR verde y revisión en pantalla de login, panel, workspace y un PDF (A-11).

### Sprint 4 · Cifras y cotización (requiere T-23 en verde)

**T-28 · Una fuente de "pendiente"** (ARQ-001, PRO-011)
- Migración `pendiente-unico`: `cotizacion_json_vivo` expone `pendiente`, `vence_pago` y `atraso_dias` desde `deudas_cotizacion()` filtrado por la cotización.
- App:
  - `src/components/documentos/vista-cotizacion.tsx:11`, `src/app/panel/cotizaciones/[id]/detalle.tsx:29` y `src/app/panel/cotizaciones/page.tsx:44` usan ese campo;
  - `src/app/panel/clientes/[id]/page.tsx:45-53` y `src/app/w/[slug]/page.tsx:81` suman por moneda desde `deudasCotizacion(clienteId)`;
  - `saldo()` queda solo para la vista previa del formulario.
- Hecho cuando: el caso 3 de T-23 da el mismo pendiente en el detalle del panel, en `ws_cotizacion`, en `portal_documento` y en `cobro_recordatorios_tomar`.

**T-29 · Versionado al enviar** (PRO-001, D3)
- Migración `cotizacion-version`:
  - columnas `version int default 1`, `enviada_documento jsonb` y `enviada_huella text` en `cotizaciones`;
  - `enviar` congela con `cotizacion_contenido`;
  - `cotizacion_json` superpone primero lo aceptado, si no lo enviado, si no lo vivo;
  - `cotizacion_aceptar_core` exige que la huella enviada coincida con la que se acepta;
  - editar una `enviada` (trigger) la pasa a `borrador` con `version + 1`.
- App:
  - `guardarCotizacion` avisa antes de editar una enviada ("Pasará a borrador v{n+1}; tendrás que reenviarla");
  - PDF y vistas muestran `v{n} · {huella:8}`.
- Hecho cuando: hay un caso nuevo en T-23 (editar tras enviar → borrador v2; aceptar desde el portal la v1 → error; reenviar y aceptar → la aceptación guarda la v2).

**T-30 · Anular** (PRO-002, D4)
- Migración `anulaciones`:
  - valor `anulada` en el enum de estado de cotización, con `anulada_en`, `anulada_motivo` y `anulada_por`;
  - función `cotizacion_anular(id, motivo)` solo para el propietario;
  - `deudas_cotizacion` y el cron excluyen `anulada`;
  - `cobros.anulado_en` y `cobros.anulado_motivo`; los cobros anulados no cuentan.
  - el trigger de inmutabilidad permite solo la transición `aceptada → anulada`.
- App:
  - acción "Anular" con motivo en el detalle;
  - al cancelar un trabajo con cotización aceptada, ofrecer anularla;
  - `eliminarCobro` pasa a `anularCobro`, con el cobro tachado en la lista.
- Hecho cuando: caso en T-23 (cotización aceptada y anulada → no aparece en deudas ni en recordatorios; la aceptación sigue intacta).

**T-31 · Rótulo y copia al aceptar** (PRO-007, D5)
- Vista (`vista-cotizacion.tsx`) y PDF (`cotizacion-pdf.tsx`): "Aceptada por {nombre} el {fecha} · desde su espacio | por enlace | registrada por aguemar".
- En `src/lib/correo/avisos.ts`, aviso a la empresa al aceptar (si `avisos_correo`) con número, huella y enlace al PDF congelado.
- Hecho cuando: test de la plantilla del correo en `correo.node.test.ts`.

**T-32 · Cobro mayor que el pendiente** (QA-008, D2)
- En el formulario de cobros (`src/app/panel/cotizaciones/cobros.tsx`), si el cobro está ligado y `monto > pendiente` (de T-28), pedir confirmación: "Excede en {diferencia}; el exceso pagará otras deudas de la empresa".
- Hecho cuando: test unitario de la función que calcula el exceso.

**T-33 · Envoltorio `accion()`** (COD-001)
- `src/lib/datos/resultado.ts`: `accion(nombre, fn)` hace `try/catch`, aplica `traducirError` y llama `Sentry.captureException(e, { tags: { accion: nombre } })` cuando el error no es de la lista conocida.
- Migrar los 164 `catch (e) { return fallo(traducirError(e).mensaje) }`, un módulo por commit.
- Hecho cuando: `rg -c "return fallo\(traducirError" src/app` → 0 y hay un test del envoltorio.

### Sprint 5 · Flujo de la cotización (decidido el 22/10/2026, D13)

Decisión D13 (22/10): el sistema no se amplía, se le quitan pasos. La cotización es la puerta de entrada: «crear cotización → enviar → la empresa acepta → el sistema hace el resto». Fuera por ahora: aviso previo al vencimiento, rechazo y comentarios desde el portal (T-35), fecha de entrega en la cotización, descuento global, plan de pagos con hitos, responsable por trabajo, cobro ligado al trabajo, documento unificado con versiones. Sin migraciones.

**T-36 · Crear con carga normal** (B-01)
- `src/lib/navegacion.ts`: `abrirCreado(href)` = `window.location.assign`. Los ocho formularios de crear (trabajo, empresa, cotización, ficha, informe, equipo, brief, acta), «Duplicar» de la cotización y «Convertir en trabajo» de la bandeja terminan ahí en vez de `router.push` / `router.replace` al detalle. Editar sigue cerrando el panel (`panel.cerrar(true)`), que funciona en producción.
- Por qué: en producción la navegación del cliente a la página grande del elemento nuevo no se pinta (A-15: 3 de 3 al crear un trabajo), y una carga completa nunca falló. Cuesta una recarga y el aviso verde desaparece. La actividad va a la lista del calendario (ligera) y no cambia.
- Hecho cuando: `fase3 · crea un trabajo` y `fase6 · arma una cotización` pasan contra `next start`, y A-15 se repite en producción tras desplegar.

**T-37 · Empresa nueva desde la cotización** (D13)
- `cotizacionSchema`: `cliente_id` admite `NUEVA_EMPRESA` con `empresa_nueva` (nombre, RUC/DNI opcional, contacto, WhatsApp, correo); `insertarCliente()` en `src/lib/datos/clientes.ts` comparte el slug único con `guardarCliente`. El formulario muestra los campos al elegir «+ Nueva empresa…» y arranca ahí cuando no hay empresas; desaparece el aviso «Primero necesitas una empresa».
- Hecho cuando: unit del schema y `fase6 · crea la empresa desde la misma cotización`.

**T-38 · Envío claro** (D13)
- `enviarCotizacion` devuelve también `correoAviso` (`correoAvisoEmpresa()` en `avisos.ts`: null sin Resend, sin correo o con avisos apagados). El diálogo tras enviar dice a qué correo salió el aviso o por qué no salió, y suma «Copiar enlace» junto a «Copiar mensaje», el PDF y WhatsApp.
- Hecho cuando: revisado en pantalla (A-17).

**T-39 · Invitar desde la cotización** (D13)
- `invitarEmpresaDesdeCotizacion(id)`: si la empresa tiene correo y no tiene usuario, crea la invitación con `crearInvitacionEmpresa()` (`src/lib/datos/equipo.ts`, compartida con `invitarEmpresa`), la manda por correo y activa el módulo `cotizaciones` (y `proyectos` si la cotización ya está aceptada). Botón «Invitar a su espacio» en el diálogo que sigue a enviar y a «Marcar aceptada»; nada automático: si no se pulsa, nada cambia.
- Hecho cuando: revisado en pantalla con una empresa de prueba de staging (A-17).

### Notas del sprint 5 · flujo (22/10/2026)

- **Decisión del flujo.** Tras ver el sistema construido, Alejandro lo fijó en tres puntos: (1) crear cotización crea o vincula la empresa, con acceso opcional; (2) se envía por enlace, correo o PDF; (3) la empresa acepta por chat (y tú la marcas) o desde el sistema, con acceso opcional. Lo que ya existía quedó como estaba: aceptar crea el trabajo, la etapa «Alcance» y una tarea por línea; publicar avisa; el cobro vencido recuerda. No se duplican como filas nuevas ni el cobro pendiente (sale de `deudas_cotizacion()`, T-28) ni la entrega en el calendario (sale de `fecha_compromiso`).
- **T-36.** Un detalle: `cotizacionSchema` validaba siempre los campos de la empresa nueva (el formulario los manda vacíos) y el borrador no se guardaba con una empresa existente; el schema los valida solo con `NUEVA_EMPRESA` y los descarta en los demás casos (unit cubre ambos). `fase5 · nuevo trabajo` cambió: antes esperaba el detalle dentro del panel lateral; ahora comprueba la página completa y que ver uno existente siga abriéndose en el panel.
- **A-17, primera pasada de Alejandro (22/10, local contra staging).** Creó una cotización y la aceptó (el trabajo apareció en la lista). Pidió dos cosas: (1) que la sección «Conformidad» del PDF, con líneas de firma, no salga cuando la cotización ya está aceptada: ahora una aceptada lleva la sección «Aceptación» (quién, cuándo, cómo, DNI) y las firmas solo salen antes de aceptar (`cotizacion-pdf.tsx`, test con el PDF aceptado en una hoja); (2) qué es «Unidad»: es la unidad a la que aplica el precio (servicio, hora, mes, equipo, página…), texto libre que se sugiere desde el catálogo de servicios. También vio una vez «Algo salió mal al cargar esta página» en `/panel/cotizaciones/nueva` que no se repitió al reintentar; sin la salida del servidor de desarrollo no se pudo diagnosticar.
- **Producción, 22/10/2026.** Alejandro vació los datos de producción conservando la configuración (A-18, respaldo propio de las 13:26) y aplicó las 11 migraciones pendientes (A-12: las 6 del sprint 2 y las 5 del sprint 4, `db:status` sin pendientes). Despliegue v0.15.0 por avance directo de la rama a `main` (sin `gh` instalado para el PR; A-14 queda como revisar el CI en `main`). Pendientes de consola: respaldo manual de InsForge y borrar los usuarios de empresa antiguos en Auth → Users.
- **Verificación.** Unit 206 pasan (2 nuevos del schema). Contra un build de producción (`next start`, un worker): fase2, fase3, fase4, fase5, fase6 (incluido `crea la empresa desde la misma cotización`), fase7, fase8 y fase9 en verde, con las mismas 9 pruebas en cuarentena de B-01 (refresco del panel tras una acción, que A-15 mostró que sí funciona en producción real). **No revisado en pantalla:** el diálogo de envío con el correo y «Copiar enlace», y el botón «Invitar a su espacio» (A-17).

### Sprint 5 · Workspace listo para los clientes

> Hecho y en producción el 22/10/2026 (v0.17.0; ver «Notas del sprint 5 · workspace» abajo).

**T-34 · Mi cuenta** (PRO-008)
- Ruta `src/app/w/[slug]/cuenta/page.tsx`:
  - cambiar contraseña, reutilizando el flujo de código de `/login/recuperar`, porque el SDK no expone cambio con la contraseña actual (verificarlo en `node_modules/@insforge/sdk` antes de decidir);
  - ver el correo de la cuenta;
  - activar o desactivar avisos por correo (`clientes.avisos_correo`, mediante una función `ws_preferencias` nueva si hace falta: entonces lleva migración).
- Enlace en `topbar-workspace.tsx`.
- Hecho cuando: pantalla revisada en staging con la cuenta de la empresa A.

**T-35 · Dudas sobre la cotización** (UX-005, PRO-008)
- Migración `comentarios-cotizacion`:
  - el enum ya incluye `cotizacion`, pero `ws_comentar` solo admite `trabajo`, `actividad` e `informe` (`db/funciones/ws_comentar.sql:25-31`);
  - añadir la rama `cotizacion`: la cotización es de su empresa, no está en borrador y el módulo Cotizaciones está activo;
  - aplicar el mismo criterio en `ws_comentarios` (ya cubierto en T-18).
- En `src/app/w/[slug]/cotizaciones/[id]/page.tsx`, bajo "Aceptar", el `Hilo` de comentarios con entidad `cotizacion`.
- Bandeja: caja de respuesta en línea en la tarjeta del comentario, con la misma acción que el hilo.
- Texto de ayuda junto a la casilla de aceptar: "Marca la conformidad para habilitar el botón".
- Hecho cuando: e2e de comentar desde el workspace y responder desde la bandeja (T-24).

### Notas del sprint 5 · workspace (22/10/2026)

- **T-34 · Mi cuenta** (`/w/[slug]/cuenta`, enlace «Mi cuenta» en el menú de usuario): correo y empresa, cambio de contraseña y avisos por correo. El SDK de InsForge no cambia la contraseña con la actual (solo `sendResetPasswordEmail` + `exchangeResetPasswordToken` + `resetPassword`, verificado en `node_modules/@insforge/sdk`), así que el botón «Enviarme un código» manda el código al correo de la sesión y los tres pasos de `/login/recuperar` se hacen dentro de la misma pantalla (`FormularioRecuperar` ahora admite `inicial` y `volver`). Los avisos usan `clientes.avisos_correo` por dos funciones nuevas (`ws_preferencias`, `ws_preferencias_guardar`, migración `ws-preferencias`).
- **T-35 · Dudas sobre la cotización**: migración `comentarios-cotizacion` (`ws_comentar` admite `cotizacion` si es de su empresa, no es borrador y el módulo está activo). La empresa ve el hilo «¿Tienes dudas?» bajo la cotización, con el texto de ayuda junto a la casilla de conformidad; tú lo ves en el detalle de la cotización (`#comentarios`) y en la Bandeja, donde cada tarjeta tiene ahora «Responder» en línea (`RespuestaEnLinea`, la misma `comentarPropietario`) para los cuatro tipos de comentario. Los avisos por correo conocen la cotización (`RUTA_PANEL`, `RUTA_ESPACIO`). El colaborador no ve estos comentarios: sus políticas ya excluían `entidad = 'cotizacion'`.
- **A-17 en staging, con capturas (contra un build de producción)**: crear la cotización con «+ Nueva empresa…» (la empresa aparece en la cabecera), enviar (el diálogo muestra el aviso de correo, «Copiar enlace», PDF y «Invitar a su espacio»), invitar (invitación creada al correo de la empresa, módulo Cotizaciones activo, Proyectos no), marcar aceptada, y volver a invitar ya aceptada (se revoca la anterior, queda una vigente y se activa Proyectos). Todo bien. **Sin Resend en staging** el diálogo dice «No salió correo…»; con la clave de producción dirá a qué correo salió.
- **Pruebas.** Nuevas: `db.spec.ts` (comentar enviada / no borrador / no de otra empresa / sin módulo, y preferencias de la empresa A sin tocar a la B) y `fase11.spec.ts` (la empresa pregunta, tú respondes desde la Bandeja, la empresa ve la respuesta y apaga y enciende sus avisos), añadida al job `e2e` del CI. Unit 207 pasan; fase4, fase6 y fase11 pasan contra `next start` con los tiempos del CI.
- **Producción (22/10)**: Alejandro aplicó las 2 migraciones (A-19, hecha) y se fusionó como v0.17.0. `T-02b` sigue esperando A-09.

## 5. Después del sprint 5 (por desglosar cuando toque)

Se desglosan con el mismo formato al llegar. Origen y detalle en `99-plan-de-accion.md` §3.

- **Comprobantes** (PRO-003, D6). Exige un bucket privado y una política de Storage; probar primero en staging.
- **Portafolio anónimo** (PRO-006, D7).
- **CSP con nonces** en las rutas con sesión (SEC-001, D8).
- **Zod en la frontera externa** (ARQ-003, COD-003).
- **Calidad del código**: hotspots y `useGuardarYSalir` (COD-004, COD-005); reglas type-aware y Prettier (COD-006).
- **Tests**: cobertura como medida (QA-004); PDF largos (QA-005).
- **UX**: `useConfirmar` (UX-003); tablero y cotización en 360 px (UX-007); microcopy (UX-008); tokens de peligro y tema del portal (UX-010); `loading.tsx` faltantes (UX-011).
- **Rendimiento**: idas y vueltas en serie (PER-002); `panel_resumen` (PER-003).
- **Idioma de `/en`**: layout raíz por idioma (A11Y-007, SEO-004).
- **SEO menor**: SEO-006.
- **Plan de pago e instancia de InsForge** (DEV-007, DEV-008).
- **Encapsular `auth.users`** (ARQ-005).
- **Mantenimiento**: test de paridad `@modal` (ARQ-007); paginación (ARQ-009).
- **Más adelante**: métricas de negocio (PRO-010); "convertir y cotizar" desde el lead (PRO-009).

Fuera por ahora, según las respuestas del 21/10:
- colaboradores (PRO-004);
- integración con SUNAT;
- OTP en la aceptación;
- páginas SEO por servicio (SEO-002 etapa 2).
