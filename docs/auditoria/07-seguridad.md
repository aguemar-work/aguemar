# 07 · Seguridad (AppSec)

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · Método: lectura de `src/`, `migrations/`, `db/funciones/` y `node_modules/@insforge/sdk`; inventario de funciones con `scripts/lib/funciones-sql.mjs`; evidencia común (`npm audit`, secretos, metadata de Auth, advisor). Sin pantalla ni e2e contra staging. Hecho = verificado en código; inferencia/opinión/supuesto se marcan.

## Diagnóstico general

La barrera de autorización es la base (RLS con `es_propietario()`, funciones `security definer` con `search_path` fijado y `revoke … from public, anon`, workspace y portal solo por `ws_*`/`portal_*`) y está bien ejecutada: las 11 SEG y 4 DAT de la auditoría del 16/10 quedaron cerradas o acotadas con evidencia propia, y el inventario `tests/unit/migraciones.node.test.ts` impide regresiones en 95 funciones. No se halló ninguna vía para que una empresa, un colaborador o una cuenta autorregistrada lea o escriba datos ajenos. Lo que queda es defensa en profundidad (token legible por JS con CSP solo en reporte), el registro abierto de InsForge sin verificación de correo (pre-registro del correo invitado), un anti-spam que puede volverse bloqueo del formulario, y límites/mensajes de autenticación que dependen del proveedor. Severidad máxima: **Media**. Ningún hallazgo crítico ni alto.

## Fortalezas (con ruta)

- Modelo de propietario y RLS: `db/funciones/es_propietario.sql`, 104 políticas `owner_id = auth.uid() and es_propietario()` (`migrations/20261016161523_miembros-cierre-base.sql:235-602`), columnas de sistema por trigger (`db/funciones/columnas_sistema.sql:10-16`).
- Workspace sin políticas: todo por `ws_*` con `ws_empresa_id()` + `visible_empresa`/`publicado` + módulo activo (`ws_trabajo.sql:22`, `ws_cotizacion.sql:14-16`, `ws_comentar.sql:25-38`, `ws_solicitar.sql:16-31` con tope 20/día).
- Portal por token de 256 bits (`generar_token.sql:9`, `gen_random_bytes(32)`), filtrado por `owner_id` + publicado y `revocado = false` (`portal_documento.sql:17-36`); `noindex` y `Cache-Control: private, no-store` en PDF (`src/lib/pdf/respuesta.ts:14-15`).
- Invitaciones: un solo uso, 7 días, `for update`, correo exacto, sin cruzar miembro/empresa (`invitacion_aceptar.sql:16-62`); formato validado antes de ir a la base (`src/lib/invitaciones.ts:10`).
- Inmutabilidad de lo aceptado (`cotizacion_aceptada_fija.sql`, copia + huella en `cotizacion_aceptar_core.sql:49-52`); `aceptaciones` sin `insert/update/delete` para la API (`politicas-rls.sql:212`, `cierre-base.sql:601`).
- Búsquedas: los 7 `.or()` pasan por `filtroOr()` (`rg "\.or\(" src` → solo `src/lib/datos/*.ts` vía `filtroOr`); `patronBusqueda` quita `% _ , ( ) \ " ' *` (`busqueda.ts:11`, test `busqueda.test.ts:10-13`).
- Cron: `timingSafeEqual` sobre sha256 (`src/app/api/cron/recordatorios/route.ts:9-12`), 503 sin `CRON_SECRET`, segunda validación por hash en la base (`cron_autorizado.sql:11-14`), sin clave de servicio.
- Sentry sin PII (`src/lib/sentry.ts:46-65`: borra `user`, `breadcrumbs`, `extra`, cabeceras; tapa tokens, correos y DNI/RUC). JSON-LD con `<` escapado (`pagina-landing.tsx:213`). CI con `npm ci --ignore-scripts` (`ci.yml:25,72`). Historial git sin secretos (evidencia común).
- Advisor: los 47 `dangerous-function` son `security definer` con `search_path = pg_catalog, public, pg_temp` y revocación de PUBLIC, cubiertos por el inventario; procede **suprimirlos con motivo** ("cubierto por tests/unit/migraciones.node.test.ts"). Revisadas a fondo `ws_trabajo`, `ws_cotizacion`, `portal_documento`, `invitacion_aceptar`, `crear_lead`, `cobro_recordatorios_tomar`: ninguna merece cambio. Los 3 `rls-no-policy` (`miembros`, `miembro_empresas`, `ajustes_sistema`) son intencionales (negar todo por API).

## Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| SEG-01 dueño público | **Cerrado** | `landing_datos.sql:12` y `crear_lead.sql:37` usan `propietario_id()`; `perfil_marca_*` exigen `es_propietario()` (`cierre-base.sql:237-239`); `created_at` lo fija el trigger (`columnas_sistema.sql:12`); e2e `seguridad.spec.ts:114-127` |
| SEG-02 toma de cuenta por UUID | **Cerrado** | `drop function … ws_admin_set_password` (`inmutabilidad-aceptados.sql:426`; no aparece en el inventario); `clientes_proteger_usuario.sql:10-14` + `usuario_vinculable.sql:11-12`; `ws_correo_usuario.sql:14-16` exige propietario y no-miembro; e2e `:129-147` |
| SEG-03 acciones sin rol | **Cerrado** (residuo en SEC-005) | `exigirPropietario()` en 11 acciones (`rg` → trabajos, fichas, documentos, equipos, informes); el resto depende de RLS que ya exige propietario/colaborador; `crearUsuarioInsforge` solo desde invitación vigente (`invitacion/[token]/acciones.ts:46-50`) |
| SEG-04 anti-spam evadible | **Cerrado** (nuevo riesgo SEC-003) | `crear_lead.sql:20-35`: longitudes, tope global 30/h y 5/h por IP dentro de la función |
| SEG-05 CSP / cookie | **Parcial** | `src/lib/csp.ts:12-13` `'unsafe-inline'`; `next.config.ts:17-19` solo `Report-Only`; SDK `dist/ssr/middleware.mjs:90` `httpOnly: false` para el access token (refresh `:98` httpOnly) → SEC-001 |
| SEG-06 DNI y aceptación débil | **Parcial** | DNI enmascarado fuera del panel (`dni_visible.sql:13-14`, e2e `:220`); la aceptación sigue siendo nombre + 8 dígitos sin verificar (`cotizacion_aceptar_core.sql:35-44`): decisión de negocio (pregunta 4 del plan) |
| SEG-07 `ws_*` sin revoke anon | **Cerrado** | Inventario: las 29 `ws_*` solo `authenticated`; `anon` limitado a 9 funciones listadas (`migraciones.node.test.ts:15-25,45-48`) |
| SEG-08 auth sin límites, contraseña compartida | **Parcial** | Invitaciones sustituyen la contraseña fijada (`clientes/acciones.ts:104-130`); límites y mensajes siguen dependiendo de InsForge → SEC-004 |
| SEG-09 inyección en `.or()` | **Cerrado** | Ver Fortalezas; `rg "\.or\("` no muestra interpolación directa |
| SEG-10 `npm audit` | **Parcial** | Evidencia común: 2 vulns prod (postcss anidado en next, build-time), 7 con dev (`braces`) → SEC-009 |
| SEG-11 superficie pública y claims | **Parcial** | `aceptaciones_delete_propio` eliminada (`cierre-base.sql:601`); `obtenerUsuario` documentado como no autorizante (`server.ts:46-49`) y en efecto solo alimenta `owner_id`/`autor_uid` que las políticas recomprueban; sigue editable el texto de comentarios de la empresa → SEC-006; `/d/*/pdf` sin límite (aceptado, `no-store`) |
| DAT-01 columnas de sistema | **Cerrado** | Trigger `columnas_sistema()` en las 27 tablas (`cierre-base.sql:205-228`, generado); e2e `:149` |
| DAT-02 `auth.users` y sesiones | **Parcial** | Función retirada (ver SEG-02); la revocación de sesiones al quitar acceso sigue sin API en el SDK (`client-DZHoCptg.d.ts:287` solo `signOut` propio); mitigado porque cada consulta recomprueba `usuario_id`/`activo` (`ws_empresa_id.sql:11`, `es_colaborador.sql:13`) → SEC-002 |
| DAT-03 migraciones sin reversa | **Abierto** | `migrations/20261013171105_limpiar-esquema-sgtd.sql` sigue en la cadena; ningún `down` |
| DAT-04 respaldos locales | **Parcial / No verificable** | `_respaldos/` ignorado y presente en disco (evidencia común); cifrado y simulacro de restauración: pregunta 8 del plan |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | SEC-001 |
| Título | Token de sesión legible por JavaScript con CSP solo en modo reporte y `'unsafe-inline'`; HSTS delegado a Vercel |
| Severidad | Media |
| Evidencia | `node_modules/@insforge/sdk/dist/ssr/middleware.mjs:83-90` (`sameSite: lax`, `httpOnly: false` en el access token); `src/lib/csp.ts:12-13`; `next.config.ts:10-19` (sin `Strict-Transport-Security`; `frame-ancestors` solo en Report-Only, `X-Frame-Options: DENY` sí se aplica) |
| Impacto | Hecho: un XSS (hoy no se encontró ninguno) robaría la sesión del propietario (panel completo: DNI, cobros, leads). La CSP no bloquea nada. Inferencia: HSTS lo añade Vercel en el dominio; no verificable sin `curl -I` en producción |
| Recomendación | Pasar a `Content-Security-Policy` con nonces (middleware de Next genera el nonce y lo pasa a `<Script>`), quitando `'unsafe-inline'` de `script-src`; añadir `Strict-Transport-Security: max-age=63072000; includeSubDomains` explícito tras confirmar con `curl -I https://aguemar.com`; revisar si el SDK admite access token `httpOnly` (hoy el cliente de navegador lo lee) o acortar su vida |
| Esfuerzo | M |
| Dependencias | — (SEG-05) |

| Campo | Contenido |
|---|---|
| ID | SEC-002 |
| Título | Registro abierto sin verificación de correo: pre-registro del correo invitado y sesiones que no se revocan |
| Severidad | Media |
| Evidencia | Evidencia común: `disableSignup: false`, `requireEmailVerification: false`, OAuth github/google activos, `passwordMinLength: 6` (rama staging; **supuesto**: producción igual). `src/lib/insforge/admin.ts:15-16` (`signUp` con clave anónima, pública); `invitacion/[token]/acciones.ts:50-57` (si el correo ya existe, pide entrar con "tu contraseña"); SDK sin API de revocación (`client-DZHoCptg.d.ts:287,391`) |
| Impacto | Inferencia: quien conozca el correo de una empresa o colaborador invitado puede registrarlo antes (contraseña de 6 caracteres, sin verificar). El invitado no puede crear la cuenta, recupera con código y fija contraseña; **si InsForge no revoca los refresh tokens al restablecer** (pregunta abierta), el atacante conserva una sesión que al aceptarse la invitación queda vinculada a la empresa (`invitacion_aceptar.sql:42-44` solo exige que el correo coincida). También: cuentas basura ilimitadas en `/sin-acceso` y OAuth sin uso en la app |
| Recomendación | En InsForge: `requireEmailVerification: true` (o desactivar el registro y crear usuarios con la API administrativa desde el servidor con clave de servicio), apagar github/google, mínimo 8 caracteres (hoy solo Zod `(auth)/acciones.ts:9` lo exige). Confirmar con el proveedor que `resetPassword` invalida sesiones; si no, en `invitacion_aceptar` rechazar cuentas creadas antes de la invitación (`auth.users.created_at < i.created_at`) salvo confirmación por código |
| Esfuerzo | S (configuración) + S (migración) |
| Dependencias | R-09, DAT-02 |

| Campo | Contenido |
|---|---|
| ID | SEC-003 |
| Título | El tope global de `crear_lead` convierte el anti-spam en bloqueo del formulario; `/api/evento` sin límite propio |
| Severidad | Media |
| Evidencia | `db/funciones/crear_lead.sql:29-31` (30/h global, ejecutable por `anon` con la clave pública); `src/app/acciones.ts:84-85` (ante "demasiados" no se usa el respaldo y el mensaje culpa a "tu conexión"); `src/app/api/evento/route.ts:14-15` (`Origin` solo si viene), `registrar_evento.sql:26-28` (tope 500/día por evento y origen) |
| Impacto | Hecho: 30 llamadas RPC por hora (sin IP, sin trampa de bots) dejan el formulario respondiendo error a todo visitante real durante esa hora; el flujo de captación es el principal del negocio (AUDITORIA §11). `/api/evento`: solo sesga métricas (sin PII, acotado) |
| Recomendación | Revocar `anon` en `crear_lead` y llamarla desde la Server Action con una clave de servicio guardada en Vercel (la IP ya viene saneada por Vercel), o desafío Turnstile verificado en servidor; al tocar el tope global, derivar a `respaldarLead` con la IP real en vez de rechazar; mensaje distinto para tope global y por IP. Regla de rate limit en Vercel Firewall para `/api/evento` y `/d/*` |
| Esfuerzo | M |
| Dependencias | SEG-04, R-07 |

| Campo | Contenido |
|---|---|
| ID | SEC-004 |
| Título | Autenticación sin límites propios y con mensajes que distinguen casos o exponen errores crudos |
| Severidad | Media |
| Evidencia | `src/app/(auth)/acciones.ts:44-57` (login sin control de intentos; `:54` "Tu correo no está verificado" confirma la cuenta), `:115` y `:197` (`error.message` del proveedor), `:153` (canje de código de 6 dígitos sin límite en la app); `src/lib/insforge/errores.ts:84` (`No se pudo completar: ${e.message}` con texto de Postgres); `clientes/acciones.ts:195` |
| Impacto | Inferencia: fuerza bruta de contraseña (mínimo 6) y del código de recuperación dependen solo de los límites de InsForge (desconocidos; `segundosDeEspera` sugiere que existen para el reenvío). Mensajes crudos revelan nombres de tablas/restricciones (bajo) |
| Recomendación | Pregunta a InsForge: límites por IP/cuenta en `signInWithPassword` y `exchangeResetPasswordToken`. Mientras tanto, regla de rate limit en Vercel Firewall para `/login` y `/login/recuperar`; respuesta única "correo o contraseña incorrectos"; en `errores.ts:84` devolver un mensaje genérico y enviar el detalle a Sentry |
| Esfuerzo | S |
| Dependencias | SEG-08 |

| Campo | Contenido |
|---|---|
| ID | SEC-005 |
| Título | Acciones exclusivas del propietario invocables por el colaborador con "falso éxito" |
| Severidad | Baja |
| Evidencia | `src/app/panel/clientes/acciones.ts:85-97,147-173,204-214`, `panel/servicios/acciones.ts`, `panel/leads/acciones.ts`, `panel/configuracion/acciones.ts:19-31`: `update`/`delete` sin `.select()` ni `exigirPropietario()`; con la sesión del colaborador la RLS afecta 0 filas sin error y la acción responde `exito` y revalida. La página sí da 404 (`soloPropietario()`), pero la Server Action es un endpoint POST aparte |
| Impacto | Hecho: sin cambio de datos (la RLS protege). Opinión: la UI miente y oculta un intento indebido; es el mismo patrón que `eliminarTrabajo` ya corrigió (`trabajos/acciones.ts:83-84`) |
| Recomendación | `exigirPropietario()` al inicio de las acciones de módulos solo-propietario (clientes, servicios, leads, marca, cotizaciones, cobros, equipo) o comprobar filas afectadas con `.select("id")`; registrar en Sentry los `SinPermisoError` |
| Esfuerzo | S |
| Dependencias | SEG-03 |

| Campo | Contenido |
|---|---|
| ID | SEC-006 |
| Título | El propietario y el colaborador pueden editar el texto de los comentarios escritos por la empresa |
| Severidad | Baja |
| Evidencia | `migrations/20261016161523_miembros-cierre-base.sql:510-511` (`comentarios_update_propio` sin restricción de columnas) y `20261016200506_equipo-invitaciones.sql:329-330` (`comentarios_colaborador_update` igual); la app solo cambia `leido` (`bandeja/acciones.ts:34,47`) |
| Impacto | Inferencia: el registro de lo que pidió o aprobó la empresa (el mismo canal donde se discuten entregas) puede reescribirse sin rastro; resto de SEG-11 |
| Recomendación | Trigger `before update` en `comentarios`: si `old.es_propietario = false` y `current_user in ('authenticated','anon')`, solo puede cambiar `leido`; alternativamente privilegios por columna |
| Esfuerzo | S |
| Dependencias | SEG-11 |

| Campo | Contenido |
|---|---|
| ID | SEC-007 |
| Título | Vistas `clientes_equipo` / `trabajos_equipo` sin `security_invoker`: el aislamiento depende solo de su `where` |
| Severidad | Baja |
| Evidencia | `migrations/20261016201140_equipo-documentos.sql:13-21` y `20261016200506_equipo-invitaciones.sql:359-376`: vistas con `where public.cliente_asignado(...)`, `grant select … to authenticated`, sin `with (security_invoker = true)`; `cliente_asignado.sql:11-13` exige colaborador activo y asignación |
| Impacto | Hecho: hoy es correcto (una cuenta sin rol obtiene 0 filas). Opinión: como el dueño de la vista salta la RLS de la tabla base, una vista futura sin ese `where`, o un cambio en `cliente_asignado`, abriría `clientes`/`trabajos` a cualquier autenticado sin que el inventario lo detecte (solo revisa funciones) |
| Recomendación | `alter view … set (security_invoker = true)` (Postgres ≥ 15) y añadir las vistas al inventario de `migraciones.node.test.ts`; `grant select` solo a través de políticas de colaborador ya existentes |
| Esfuerzo | S |
| Dependencias | ADR-09 |

| Campo | Contenido |
|---|---|
| ID | SEC-008 |
| Título | Secretos en disco fuera del gestor: `.insforge/project.json` con `api_key` y `.env.local.bak-produccion` |
| Severidad | Baja |
| Evidencia | `ls`: `.env.local.bak-produccion` (206 B, 16/10) y `.insforge/project.json` (423 B, 20/10), ambos ignorados (`git check-ignore -v` → `.gitignore:34,54`); `git log --all --name-only` nunca los rastreó. Claves del `.bak`: solo `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (valores públicos por diseño). Claves de `project.json`: `project_id`, `org_id`, `appkey`, `api_key`, … (la CLI opera la base con ella) |
| Impacto | Hecho: el `.bak` no contiene secretos reales (la anon key viaja al navegador); el riesgo real es `api_key` de la CLI en texto plano en un equipo personal (robo del portátil = control total de staging y, con `project.parent.json`, de producción). Alejandro ya gestiona el `.bak` (ajuste 4 del plan) |
| Recomendación | Borrar el `.bak`; cifrado de disco (BitLocker) y bloqueo de sesión; rotar la `api_key` de la CLI tras la auditoría y cada vez que se comparta pantalla; valorar `insforge logout` al terminar el día |
| Esfuerzo | S |
| Dependencias | DEV-04 |

| Campo | Contenido |
|---|---|
| ID | SEC-009 |
| Título | Dependencias con avisos (`postcss` anidado en `next`, `braces` en dev) y auditoría informativa en CI |
| Severidad | Baja |
| Evidencia | Evidencia común: `npm audit --omit=dev` → 1 moderada + 1 alta en `node_modules/next/node_modules/postcss` (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q…); `npm audit` → 7 (`braces` vía `eslint-config-next`); `ci.yml:37-39` `continue-on-error: true`; PR de Dependabot a `next 16.4.0` abierto |
| Impacto | Opinión: exposición práctica baja. PostCSS solo procesa el CSS propio en el build (no corre en el navegador ni en el servidor en producción); `braces` es de desarrollo. El riesgo real es acostumbrarse a un audit rojo |
| Recomendación | Probar `overrides: { postcss: ">=8.5.23" }` en `package.json`; planificar Next 16 con la PR de Dependabot en una rama; cuando quede en verde, quitar `continue-on-error` |
| Esfuerzo | M (Next 16) |
| Dependencias | SEG-10, DEV-05 |

## Supuestos y preguntas abiertas

- **Supuesto:** la configuración de Auth de producción coincide con la de la rama `staging` (registro abierto, sin verificación, mínimo 6, OAuth github/google). Confirmar en la consola del proyecto principal (afecta SEC-002).
- **Supuesto:** Vercel añade `Strict-Transport-Security` en aguemar.com y sanea `x-forwarded-for` (la primera IP es la del cliente real). `ipDe()` (`src/lib/ip.ts:7`) sería falsificable fuera de Vercel. Verificar con `curl -I https://aguemar.com`.
- **Pregunta a InsForge:** ¿`resetPassword` revoca refresh tokens vivos? ¿Qué límites de intentos aplican a `signInWithPassword` y al canje del código de 6 dígitos? ¿Hay API administrativa para crear usuarios y revocar sesiones (DAT-02)?
- **Pregunta abierta:** ¿hay aceptaciones reales en producción con DNI (SEG-06)? Define si la aceptación "nombre + DNI" basta (pregunta 4 del plan) o si se añade un código por correo.
- **No verificable desde el código:** cabeceras reales en producción, reportes CSP recibidos en Sentry (sin DSN propio aún), protección de la rama `main`, secretos `STAGING_*`/`E2E_*` cargados (el job `seguridad` del CI se salta sin ellos, `ci.yml:79-81`), último `db:respaldo` y simulacro de restauración (DAT-04).
- **Inferencia asumida:** `current_user in ('authenticated','anon')` en los triggers (`columnas_sistema.sql:10`, `cotizacion_aceptada_fija.sql:12`) presupone que la API de InsForge siempre entra con esos roles; si el proveedor introdujera otro rol de API, los triggers dejarían de proteger. Conviene documentarlo en `CLAUDE.md` y cubrirlo en `seguridad.spec.ts`.
