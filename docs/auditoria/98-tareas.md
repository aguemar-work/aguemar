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
| T-17 | Topes de `crear_lead` reordenados; tope global al respaldo | SEC-003 | 2 | **Sí** | No | — | Pendiente |
| T-18 | `ws_trabajos`, `ws_trabajo` y `ws_comentarios` comprueban el módulo | ARQ-006 | 2 | **Sí** | No | A-10 | Pendiente |
| T-19 | La empresa es la única que puede cambiar el texto de sus comentarios | SEC-006 | 2 | **Sí** | No | A-10 | Pendiente |
| T-20 | Test de inventario para las vistas de `public` | SEC-007 (D11) | 2 | No | No | — | Pendiente |
| T-21 | Marcar invitaciones aceptadas con una cuenta previa | SEC-002 (D10) | 2 | **Sí** | Sí | — | Pendiente |
| T-22 | Retirar del árbol de migraciones la limpieza del sistema heredado | DEV-006, ARQ-004 | 2 | No (solo mover) | No | — | Pendiente |
| T-23 | Suite de pruebas de las funciones SQL críticas contra staging | QA-001 | 3 | No | No | A-10 | Pendiente |
| T-24 | e2e de navegador en CI con `next start`; guard `.test` en todos los specs | QA-002, DEV-004 | 3 | No | No | A-02 | Pendiente |
| T-25 | Fixtures con limpieza, `retries: 1`, artefactos en CI | QA-003, QA-006 | 3 | No | No | T-24 | Pendiente |
| T-26 | Fixture compartido de totales TS ↔ SQL | ARQ-002 | 3 | No | No | T-23 | Pendiente |
| T-27 | Next 16 en rama aparte | ARQ-008, PM-006, SEC-009 | 3 | No | Sí | T-24 | Pendiente |
| T-28 | Una sola fuente de "pendiente de pago" | ARQ-001, PRO-011 | 4 | **Sí** | Sí | T-23 | Pendiente |
| T-29 | Versionado de la cotización enviada (D3) | PRO-001 | 4 | **Sí** | Sí | T-23, T-28 | Pendiente |
| T-30 | Anular cotización aceptada y cobros (D4) | PRO-002 | 4 | **Sí** | Sí | T-28 | Pendiente |
| T-31 | Rótulo y correo de copia al aceptar (D5) | PRO-007 | 4 | No | Sí | T-29 | Pendiente |
| T-32 | Confirmación de cobro mayor que el pendiente (D2) | QA-008 | 4 | No | Sí | T-28 | Pendiente |
| T-33 | Envoltorio `accion()` que traduce y reporta | COD-001 | 4 | No | No | T-04 | Pendiente |
| T-34 | "Mi cuenta" en el workspace | PRO-008 | 5 | No | Sí | — | Pendiente |
| T-35 | "Tengo dudas" en la cotización y respuesta en línea en la bandeja | UX-005, PRO-008 | 5 | **Sí** | Sí | T-18, T-29 | Pendiente |

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

### Sprint 5 · Workspace listo para los clientes

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
