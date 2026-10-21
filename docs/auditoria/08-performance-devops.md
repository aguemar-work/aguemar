# 08 · Performance y DevOps

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · Perfil: Ingeniero de Performance / DevOps (externo) · Evidencia: build de solo lectura en `.next-verify/` (`NEXT_DIST_DIR=.next-verify npx next build`, 66 s, exit 0), manifests, `rg`/`grep` sobre chunks, lectura de código. No hubo servidor en marcha ni métricas de campo.

## 1. Diagnóstico general

La capa de velocidad del servidor está bien pensada y verificada: identidad desde el token sin red, `obtenerRol` cacheado por petición, `Promise.all` en las páginas, `panel_resumen()` en una sola llamada, índices que cubren todas las consultas del inicio y de los tokens. Lo que ha empeorado es el **peso en el navegador**: entre el 16/10 y hoy el First Load compartido subió a 174 kB y la landing a 242 kB (antes 165), porque el SDK de Sentry y el núcleo de Zod entraron en el chunk común y el formulario "diferido" sigue viajando en el primer HTML. En DevOps el salto es grande (CI, staging, Dependabot, respaldos con script) pero el **último tramo sigue manual y sin vigilancia**: nada impide un deploy en rojo, el cron y los PDF fallan solo a `console.error`, Sentry no tiene DSN, no hay uptime y la restauración nunca se ensayó.

## 2. Fortalezas (con evidencia)

- `src/lib/insforge/server.ts:51-57` lee la identidad de los claims del token (sin red); `:79-89` calcula el rol una vez por petición (`cache`) con `mi_rol` y `ws_mi_empresa` en paralelo. `src/lib/datos/workspace.ts:226` cachea `ws_mi_empresa` entre layout y página.
- Dashboard en una sola llamada: `src/lib/datos/inicio.ts:45` → `db/funciones/panel_resumen.sql` (167 líneas, `stable`, `security invoker`). Índices que cubren sus filtros: `comentarios(owner_id, leido)` (`migrations/20261014152859_empresas-workspaces.sql:43`), `trabajos(owner_id, estado, orden)` y `(owner_id, fecha_compromiso)` (`20261013214815_trabajos.sql:37,39`), `cotizaciones(owner_id, estado)` (`20261013171433_esquema-base.sql:152`), `actividades(owner_id, fecha)` (`20261015162658_calendario-solicitudes.sql:33`), `fichas(owner_id, proximo_mantenimiento)` (`esquema-base.sql:195`), `solicitudes(owner_id, estado, created_at)`; `enlaces_publicos.token` e `invitaciones.token` son `unique` (`esquema-base.sql:291`, `20261016200506_equipo-invitaciones.sql:502`). 7 índices más del advisor (`20261015224849_indices-advisor.sql`).
- Landing estática con `revalidate = 3600` (`src/app/page.tsx:6`, `en/page.tsx:6`), regenerada al guardar servicios y marca (`panel/servicios/acciones.ts:11-12`, `panel/configuracion/acciones.ts:37-38`); `datosLanding` lanza si la base falla para no cachear una versión vacía (`src/lib/datos/landing.ts:28`). HTML de la landing 74 kB (13,7 kB gz); CSS 65 kB (11,7 kB gz).
- Middleware solo en rutas con sesión (`src/middleware.ts:15`; `middleware-manifest.json` confirma 5 matchers). `public/` pesa 36 kB (dos SVG y el `.ps1`); no hay imágenes raster. `lucide-react` solo con imports nombrados (98 archivos, 0 imports por defecto). `@vercel/analytics` solo en la landing (`src/components/landing/pagina-landing.tsx:10`).
- Correos y eventos fuera del camino crítico con `after()` (`src/lib/correo/avisos.ts:37`, `src/app/acciones.ts:53`, `src/app/w/[slug]/layout.tsx:29`).
- CI real (`.github/workflows/ci.yml`, desde `16730dc` 16/10): `npm ci --ignore-scripts`, tipos, lint, 154 tests (11 s), audit informativo, build; `concurrency` con cancelación; `timeout-minutes: 15`. Dependabot semanal con grupo `menores-y-parches` y acciones mensuales (`.github/dependabot.yml`). Staging schema-only separada de producción; `scripts/staging.mjs:34-42` se niega a correr fuera de una rama; `playwright.config.ts:38` sin `webServer` ni credenciales reales.
- Secretos: `src/lib/env.ts:30-32` hace fallar el build si `NEXT_PUBLIC_SITE_URL` es localhost con `VERCEL_ENV=production` (verificado en código). Cron sin clave de servicio: comparación en tiempo constante (`src/app/api/cron/recordatorios/route.ts:9-12`) y hash en `ajustes_sistema` (README:166-168). `next.config.ts:23` sin `X-Powered-By`; cabeceras de seguridad y CSP en modo reporte.
- Sentry limpio por diseño (`src/lib/sentry.ts:11-21,46-66`: sin PII, `tracesSampleRate: 0`, `enabled: Boolean(dsn)`), `onRequestError` en `src/instrumentation.ts:10`, source maps subidos y borrados si hay token (`next.config.ts:53`).
- `scripts/respaldo.mjs`: exige carpeta ignorada por git (`:27-34`), marca `-INCOMPLETO` si una tabla toca el tope de 10 000 filas de la CLI (`:44-57`); README §Respaldos documenta el procedimiento de tres pasos.

## 3. Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| PER-01 landing vacía cacheada | **Cerrado** | `src/lib/datos/landing.ts:28` lanza con InsForge configurado; `revalidatePath("/")`/`("/en")` en `servicios/acciones.ts:11-12` y `configuracion/acciones.ts:37-38` |
| PER-02 latencia us-east | **Parcial / No verificable** | Mitigaciones confirmadas (`server.ts:51-89`, `inicio.ts:45`, `Promise.all` en 4 páginas). Sin métricas de campo; en producción la función corre junto a la base (R-05), así que la cifra de 0,35–0,6 s solo aplica a `npm run dev` desde Perú. Quedan 2–3 idas y vuelta en serie por página (PER-002) |
| PER-03 middleware en `/` y JS de la landing | **Parcial** | Matcher ya excluye `/` y `/d` (`src/middleware.ts:15`). Pero la landing pasó de 165 a **242 kB** y `index.html` carga `chunks/5933-…js` (Zod + React Hook Form, 35 kB gz) aunque el formulario está en `dynamic()` (`pagina-landing.tsx:24`) → PER-001 |
| DEV-01 un solo entorno | **Cerrado** | Contexto CLI = rama `staging` (evidencia global); `scripts/staging.mjs:34-42`; README:43 "local y e2e apuntan siempre a staging"; `playwright.config.ts:38` |
| DEV-02 sin CI | **Parcial** | `ci.yml` corre en PR y `main`. Protección de `main` y "Require checks" en Vercel: **no verificable** (`gh` no instalado; README:139 lo deja como tarea del propietario). Vercel sigue publicando con cada push → DEV-001 |
| DEV-03 sin monitorización | **Parcial** | Sentry en código, pero `enabled: Boolean(dsn)` y DSN pendiente; cron y PDF capturan el error y solo hacen `console.error` (`route.ts:29-31`, `pdf/respuesta.ts:27-28`), así que Sentry no los vería ni con DSN; sin uptime → DEV-003 |
| DEV-04 secretos y radio de daño | **Parcial** | README:39 ya prohíbe la clave de servicio en Vercel; e2e con cuentas de staging. `.env.local.bak-produccion` (206 B, 16/10) sigue en disco → DEV-005 |
| DEV-05 dependencias | **Cerrado (con cola)** | `dependabot.yml`; `package.json:16-17` usa el binario local. 7 ramas de Dependabot sin fusionar (`next-16.4.0`, `eslint-10.12.0`, `eslint-config-next-16.4.0`, 4 grupos menores); el `npm audit` alto (postcss) solo se resuelve con Next 16 → DEV-004 |
| DAT-03 migraciones sin reversa | **Abierto (mitigado)** | `migrations/20261013171105_limpiar-esquema-sgtd.sql` sigue en la cadena con 97 `DROP`; 25 migraciones sin `down`; expand/contract solo como frase (README:142), sin checklist (R-08) → DEV-006 |
| DAT-04 respaldos y datos locales | **Abierto** | `_respaldos/` tiene 4 volcados sin cifrar: 2 de producción del 20/10 (206 y 215 kB) y 2 del sistema heredado del 13/10 (1,4 MB); simulacro `[PENDIENTE]` (README:99) → DEV-002 |
| R-10 PDF sin caché | **Abierto (aceptado)** | `src/lib/pdf/respuesta.ts:14` responde `Cache-Control: private, no-store`; función de 731 archivos / 15,3 MB sin comprimir (`route.js.nft.json`), de los que fontkit 1,06 MB y `@sentry/server-runtime-injection` 1,05 MB |

## 4. Hallazgos

| Campo | Contenido |
|---|---|
| ID | PER-001 |
| Título | Sentry y el núcleo de Zod van en el chunk compartido; la landing carga 242 kB con el formulario "diferido" incluido |
| Severidad | Media |
| Evidencia | `build.txt`: shared 174 kB (`4bd1b696` 54 kB = React/ReactDOM; `7848` 115 kB gz / 365 kB raw). `grep -o` en `7848`: `sentry` ×144, `BrowserClient`, `Replay` ×2, `_zod` ×39, `jitless` ×1 → `src/instrumentation-client.ts:2,8` importa `config` de `zod` para `jitless`, lo que arrastra el core de Zod a todas las rutas. `index.html`/`en.html` incluyen `5933-…js` (`_zod` ×275, `formState` ×26: Zod completo + RHF, 35 kB gz), `8720` (sonner, 9,5 kB gz, por el `Toaster` del layout raíz `src/app/layout.tsx:39`) y `3201` (analytics, 4 kB). `next.config.ts:49-56` no pasa `bundleSizeOptimizations` a `withSentryConfig`. Hoy, sin DSN, todo el SDK del navegador es peso muerto |
| Impacto | +77 kB respecto al 16/10 en la página que debe convertir visitantes desde móvil en Perú; peor LCP/TBT en 3G/4G; el panel arrastra lo mismo en cada navegación inicial |
| Recomendación | (1) `withSentryConfig(..., { bundleSizeOptimizations: { excludeDebugStatements: true, excludeTracing: true, excludeReplayIframe: true, excludeReplayShadowDom: true, excludeReplayWorker: true } })`. (2) Mover `configurarZod({ jitless: true })` al módulo del formulario (o importar `config` desde `zod/v4/core`) para sacar Zod del chunk común. (3) Comprobar por qué `dynamic()` en un Server Component no evita el chunk 5933: envolver el formulario en un client component que haga el `dynamic(…, { ssr: false })` o cargarlo al hacer scroll/clic. (4) `Toaster` solo en los layouts de panel, workspace y login. Medir después con `@next/bundle-analyzer` (dev) y Lighthouse |
| Esfuerzo | S |
| Dependencias | DEV-003 (si no habrá DSN, valorar quitar Sentry del cliente de la landing) |

| Campo | Contenido |
|---|---|
| ID | PER-002 |
| Título | Dos a tres idas y vuelta en serie por página y una llamada duplicada en el workspace |
| Severidad | Baja |
| Evidencia | `/panel`: `obtenerRol` (`page.tsx:35`) → `resumenInicio` (`:37`): 2 en serie. `/panel/clientes/[id]`: `soloPropietario` (`page.tsx:34`) → `Promise.all` de 6 (`:36`) → `correoDeUsuario` (`:45`): 3 en serie. `/panel/cotizaciones/[id]`: `soloPropietario` (`page.tsx:9`) → `Promise.all` de 3 (`detalle.tsx:22`) donde `deudasCotizacion()` sin `clienteId` recalcula las deudas de todas las empresas para mostrar una. `/w/[slug]`: `obtenerRol` ya llama `ws_mi_empresa` (`server.ts:88`) y el layout vuelve a pedirla por otra caché (`layout.tsx:26` → `workspace.ts:226`) → la misma RPC dos veces por petición, y luego el `Promise.all` de la página (`page.tsx:19`): 3 en serie |
| Impacto | En producción (función junto a la base) son decenas de ms; en local desde Perú, 0,7–1,8 s por página. Sin medida de campo no se puede afirmar que el usuario lo note |
| Recomendación | Que `obtenerRol` exponga la empresa que ya trajo (o que `ws.miEmpresa` lea de la misma caché); `deudasCotizacion(c.cliente_id)` en el detalle; `ws_correo_usuario` como columna de `cliente_panel`/join. Antes de más optimización: activar Speed Insights y confirmar la región de las funciones (R-05) |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | PER-003 |
| Título | `panel_resumen()` y `deudas_cotizacion()` escalan por filas: subconsultas correlacionadas y agregados sin filtro |
| Severidad | Baja |
| Evidencia | `db/funciones/panel_resumen.sql:14-20`: tres subconsultas correlacionadas sobre `trabajo_tareas` por cada trabajo activo; `:23-34` suma todas las cotizaciones aceptadas y todos los cobros; `:37-42` llama `deudas_cotizacion()` completa (ventana + subconsulta `bolsa` por fila, `deudas_cotizacion.sql:33-52`); ~20 escalares `count(*)` sin más filtro que la RLS. `trabajo_tareas` solo tiene índices por `(trabajo_id, orden)`, `(etapa_id, orden)` y `owner_id` (sin `hecha`/`fecha_limite`) |
| Impacto | Con ≤5 empresas y cientos de filas es imperceptible (todo cabe en memoria); se vuelve lineal-cuadrático pasados algunos miles de trabajos/cobros. No es urgente, pero el dashboard es la página más visitada |
| Recomendación | Reescribir `activos` con un `left join lateral` agregando tareas una sola vez; `explain analyze` en staging con datos sintéticos (p. ej. 2 000 trabajos) antes de la fase 16; índice parcial `trabajo_tareas(trabajo_id) where not hecha` si el plan lo pide |
| Esfuerzo | M |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | DEV-001 |
| Título | Vercel publica cada push a `main` sin esperar al CI; protección de rama no verificable |
| Severidad | Alta |
| Evidencia | README:139 pide proteger `main` "exigiendo el check `verificar`" como tarea manual; `ci.yml` no bloquea nada por sí mismo; sin `gh` ni acceso a Vercel no se pudo confirmar "Require checks"/"Deployment protection". Los PR de Dependabot (`next-16.4.0`, `eslint-10.12.0`) se fusionaron desde la web (`06067f4`, `898d9ba`), es decir, el flujo real pasa por PR, pero un `git push` directo sigue siendo posible. `ci.yml` sin bloque `permissions:` (token con permisos por defecto) |
| Impacto | Una regresión de tipos o un test roto puede llegar a producción el mismo día que se escribe; el CI es informativo, no un filtro |
| Recomendación | GitHub → Branches → ruleset en `main`: requerir PR + status check `verificar`, bloquear force-push. Vercel → Git: "Ignored Build Step" o "Require checks" para no desplegar en rojo. Añadir `permissions: { contents: read }` al workflow. Documentar en README la fecha en que quedó activo |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | DEV-002 |
| Título | Recuperación no ensayada: respaldo manual único, export sin cuentas, sin copia externa ni cifrado |
| Severidad | Alta |
| Evidencia | README:89 "un solo respaldo manual"; README:97 export sin `auth.users`; README:99 `[PENDIENTE: primer simulacro]`; `scripts/respaldo.mjs:45` tope de 10 000 filas; `_respaldos/` con 2 exports del 20/10 y 2 volcados heredados del 13/10 sin cifrar en el disco de desarrollo; ningún job programado (`ls .github/workflows` → solo `ci.yml`; `vercel.json` solo el cron de recordatorios). RPO estimado: días a semanas (depende de que el propietario corra el script); RTO: desconocido, nunca medido |
| Impacto | R-01 (crítico) sigue abierto: un borrado accidental, una migración equivocada o la pérdida del proyecto en InsForge obligarían a restaurar algo que nunca se probó; las FK a `auth.users` pueden impedir importar el export en un proyecto nuevo |
| Recomendación | (1) Simulacro ahora: `branch create --mode schema-only` + `db import` del export, cronometrar y anotar los pasos en README:99. (2) Export semanal automático (workflow con `schedule` y la CLI en contexto producción, subiendo el `.sql` cifrado con `age`/`gpg` a un artefacto o a almacenamiento externo). (3) Borrar o cifrar los volcados heredados `sgtd-*`. (4) Pedir a InsForge el procedimiento de restauración de `backups` y el precio de respaldos programados |
| Esfuerzo | M |
| Dependencias | DEV-006 |

| Campo | Contenido |
|---|---|
| ID | DEV-003 |
| Título | Observabilidad a medias: sin DSN, cron y PDF fallan solo a consola, sin uptime ni alerta del cron |
| Severidad | Media |
| Evidencia | `src/lib/sentry.ts:15` `enabled: Boolean(dsn)`; DSN pendiente (CLAUDE.md fase 15). `api/cron/recordatorios/route.ts:29-31` captura y hace `console.error` + 500: `onRequestError` no lo ve y Vercel Cron no reintenta; `console.info` con el resultado (`:27`) lo lee solo quien abra los logs. `pdf/respuesta.ts:27-28` igual, con un mensaje al usuario que promete "ya quedó registrado el error". `recordatorio-pago.ts:131-135` envía los correos en serie y los fallidos vuelven a la base sin aviso. 14 `console.*` con prefijo `[módulo]` pero sin JSON ni id de petición. Solo 3 `Sentry.capture*` en todo `src/` |
| Impacto | R-06: un día sin recordatorios, un PDF que no sale o un portal caído no los ve nadie hasta que un cliente avisa |
| Recomendación | Crear la organización de Sentry y cargar el DSN (README:176-180); `Sentry.captureException` en los `catch` del cron, del PDF y de `workspace.ts:220`; monitor de uptime gratuito (Better Stack/UptimeRobot) sobre `/`, `/login` y un `/d/<token>` de prueba; en Sentry, un Cron Monitor (`Sentry.withMonitor`) para `/api/cron/recordatorios` con alerta si no corre a las 9:00; activar Vercel Web Analytics y Speed Insights |
| Esfuerzo | S |
| Dependencias | PER-001 (decidir el peso de Sentry en el cliente) |

| Campo | Contenido |
|---|---|
| ID | DEV-004 |
| Título | CI sin e2e ni caché de build, y cola de mayores sin fusionar (Next 16 arrastra el `npm audit` alto) |
| Severidad | Media |
| Evidencia | `ci.yml:33-45`: sin Playwright (13 specs solo a mano), sin caché de `.next/cache` (build 66 s cada vez), `npm audit … continue-on-error: true` (`:37-39`); job `seguridad` saltado sin secretos (`:79-81`; pregunta 7 del plan). Build sin variables de InsForge: `landing_datos` nunca se ejercita en CI. Ramas abiertas: `dependabot/npm_and_yarn/next-16.4.0`, `eslint-10.12.0`, `eslint-config-next-16.4.0`, 4 `menores-y-parches`; `npm audit --omit=dev` → 1 alta + 1 moderada en `postcss` dentro de `next`, corregible solo con Next 16 |
| Impacto | Las regresiones de flujo (aceptar, publicar, invitar) y las de aislamiento no se detectan antes del deploy; la deuda de mayores crece y el audit "informativo" se normaliza |
| Recomendación | Cargar `STAGING_*`/`E2E_*` en GitHub (activa el job `seguridad`); `actions/cache` sobre `.next/cache`; planificar la subida a Next 16 en una rama con `next build` y los e2e contra staging; `--audit-level=critical` bloqueante hasta entonces; en PR, `npx playwright test --project escritorio` con `webServer` apuntando a staging (`playwright.config.ts:38` hoy lo prohíbe por diseño) |
| Esfuerzo | M |
| Dependencias | DEV-001 |

| Campo | Contenido |
|---|---|
| ID | DEV-005 |
| Título | Copia de variables de producción en disco y secreto del cron con procedimiento manual de tres pasos |
| Severidad | Media |
| Evidencia | `.env.local.bak-produccion` (206 B, 16/10) fuera del gestor de secretos (ajuste 4 del plan: lo gestiona Alejandro); `.env.local` 1,4 kB con contraseñas E2E de staging. README:164-168: `CRON_SECRET` se genera, se hashea y se inserta a mano en `ajustes_sistema` de cada entorno; si Vercel y la base divergen, el cron responde 401 en silencio (`route.ts:23`) |
| Impacto | Un equipo perdido o un malware de escritorio expone producción; una rotación olvidada del secreto deja los recordatorios sin salir sin que nadie lo note (ver DEV-003) |
| Recomendación | Borrar el `.bak` (Vercel es la fuente de verdad; `vercel env pull` cuando haga falta); script `scripts/cron-secret.mjs` que genere, hashee e inserte en el contexto actual de la CLI; alerta en Sentry si el cron devuelve 401/503 |
| Esfuerzo | S |
| Dependencias | DEV-003 |

| Campo | Contenido |
|---|---|
| ID | DEV-006 |
| Título | Migraciones a producción a mano, sin checklist expand/contract ni reversa |
| Severidad | Media |
| Evidencia | README:142 "siempre compatibles con el código que sigue publicado" como única regla; README:83 `branch switch --parent; npm run db:migrate; branch switch staging` sin paso previo obligatorio de respaldo ni verificación posterior; 25 migraciones sin `down`; `20261013171105_limpiar-esquema-sgtd.sql` (97 `DROP … CASCADE`) sigue en la cadena que aplica `up --all` a cualquier base nueva |
| Impacto | R-08: un orden equivocado (código nuevo que usa una función que aún no existe, o migración que rompe la función que el código publicado llama) deja producción caída hasta corregir a mano |
| Recomendación | Checklist de 5 pasos en README (respaldo → migrar producción → `db:funciones` sin diff → deploy → smoke test de `/`, `/login`, `/d/<token>`); mover la limpieza heredada a `scripts/` fuera de `migrations/`; exigir en cada migración un bloque comentado "reversa" aunque sea manual; `npm run db:status` en el checklist para comparar staging y producción |
| Esfuerzo | S |
| Dependencias | DEV-002 |

| Campo | Contenido |
|---|---|
| ID | DEV-007 |
| Título | Plan Vercel Hobby con uso comercial y límites de función sin confirmar (PDF 15 MB, 12 funciones) |
| Severidad | Baja |
| Evidencia | Supuesto del plan (pregunta 6): Hobby. Los términos de Hobby excluyen el uso comercial; aguemar factura a empresas. 12 rutas PDF con `outputFileTracingIncludes` (`next.config.ts:31-44`), cada función 731 archivos / 15,3 MB (`pdf/route.js.nft.json`) sin `maxDuration` (`grep` → solo el cron tiene 60); `vercel.json` sin `regions`. Resend gratuito 100 correos/día compartidos entre avisos y recordatorios; Sentry Developer 5 000 errores/mes |
| Impacto | Riesgo de suspensión del proyecto por términos; un PDF largo en arranque en frío puede rozar los 10 s si no hay Fluid Compute; sin datos de cuota de InsForge no se sabe cuándo se agota |
| Recomendación | Confirmar plan y pasar a Pro si procede; fijar `export const maxDuration = 30` en las rutas PDF; anotar en README el plan y los límites de InsForge, Resend y Sentry con fecha |
| Esfuerzo | S |
| Dependencias | — |

## 5. Supuestos y preguntas abiertas

1. **Métricas de campo**: no hay Lighthouse ni CWV reales (dev server apagado; Speed Insights sin activar). Los tamaños son del build local, gzip estimado con `gzip -c`.
2. **Región de las funciones de Vercel**: supuesto `iad1` (sin `regions` en `vercel.json`); si fuera otra, PER-002 sube de severidad. ¿Fluid Compute activo? Determina el `maxDuration` por defecto (10 s vs 300 s) para los PDF.
3. **Plan de InsForge**: límites de filas, egress y respaldos programados; ¿`backups restore` sobre una rama es posible? Determina el RTO de DEV-002.
4. **DSN de Sentry**: ¿existe ya la organización? Mientras no, el SDK en el navegador es peso muerto (PER-001) y DEV-003 sigue abierto.
5. **Protección de `main` y "Require checks" en Vercel**: no verificable desde el repo (`gh` no instalado); DEV-001 se marca Alta por precaución.
6. **Secretos `STAGING_*`/`E2E_*` en GitHub**: si ya están, el job `seguridad` corre y DEV-004 baja a Baja.
7. **Plan de Vercel**: Hobby (supuesto) vs Pro; afecta a DEV-007 y a los límites de cron y funciones.
8. **Atribución exacta del chunk de 115 kB**: estimada por marcadores de texto (`sentry` ×144, `_zod` ×39, runtime de Next); confirmar con `@next/bundle-analyzer` en local antes de actuar.
