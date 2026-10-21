# 01 · Arquitectura

> Auditoría externa · 20/10/2026 · `main` = `f47ac68` · Solo lectura. Evidencia propia (archivo:línea o comando + salida); nada se da por cerrado porque lo diga `ARQUITECTURA.md` o `AUDITORIA.md`.

## Diagnóstico general

Monolito modular Next.js 15 (App Router) sobre InsForge/Postgres, donde la base es a la vez capa de autorización (RLS + 75 funciones `security definer`) y de dominio (numeración, totales, aceptación, inmutabilidad). Es la arquitectura adecuada para un propietario y menos de 50 empresas: sin ciclos de importación (`madge --circular` → 0), capas respetadas (ninguna página hace `.from()`; el workspace solo `rpc("ws_*")`), una sola proyección `*_json` para panel, workspace, portal y PDF. Los riesgos reales no son de diseño sino de **consistencia entre SQL y TypeScript**: tres fórmulas distintas de "saldo pendiente", espejos TS de triggers sin prueba de paridad, tipos manuales con 129 `as X`, y migraciones solo hacia adelante que redefinen 26 funciones. El acoplamiento a InsForge es moderado y acotado; la deuda registrada (ARQ-02/03) sigue parcial o abierta.

## Fortalezas

- **Capas limpias.** `rg '\.from\(' src/app src/components --glob '!**/acciones.ts'` → solo `Array.from`. Lecturas en `src/lib/datos/*` (60 `.from`, 16 `.rpc`); `src/lib/datos/workspace.ts:204-244` únicamente `rpc("ws_*")`; `src/lib/datos/portal.ts:14-21` solo `portal_documento`. 19 `acciones.ts`, 90 Server Actions, 87 firmas `Resultado<T>`.
- **Rol de colaborador sin tocar el código de las páginas**: `src/lib/datos/base.ts:44-73` (`Proxy` que redirige `from("clientes"|"trabajos")` a las vistas `*_equipo` y reescribe el `select`, `src/lib/datos/vistas-equipo.ts:13-18`). Ingenioso y probado (`tests/unit/vistas-equipo.test.ts`).
- **Documento compartido real.** `portal_documento` (`db/funciones/portal_documento.sql:23-35`), `ws_cotizacion` (`:11`) y `cotizacion_panel` (`:11`) llaman al mismo `cotizacion_json`, que superpone la copia aceptada al vivo (`db/funciones/cotizacion_json.sql:11-14`). Los tres PDF (`src/app/{panel,w/[slug],d/[token]}/.../pdf/route.ts`) parten de esa proyección.
- **Inmutabilidad en la base, no en la app**: `migrations/20261020171216_inmutabilidad-aceptados.sql:314-316, 384-386` (`current_user not in ('anon','authenticated')`).
- **Inventario de funciones como test**: `tests/unit/migraciones.node.test.ts:35-64` (search_path, PUBLIC, `anon` fuera de la lista blanca, `db/funciones/` actualizado). `scripts/funciones-vigentes.mjs` deriva la versión vigente de `migrations/`, sin depender de la base.
- **Velocidad consciente de la latencia**: identidad desde claims (`src/lib/insforge/server.ts:51-65`), rol en una ida y vuelta (`:86-89`), `panel_resumen()` con topes (`db/funciones/panel_resumen.sql:66-159`, limit 5–10 por bloque), middleware solo en rutas con sesión (`src/middleware.ts:15`).
- **SDK acotado**: `@insforge/sdk` solo en 7 archivos (`rg 'from "@insforge/sdk' src`): 4 en `src/lib/insforge/`, más `api/auth/refresh/route.ts`, `lib/datos/landing.ts` e `invitacion/[token]/acciones.ts`.

## Hallazgos previos verificados

| ID previo / ADR | Estado | Evidencia nueva |
|---|---|---|
| ARQ-01 dueño ambiguo | **Cerrado** | 112 `es_propietario()` en `migrations/20261016161523_miembros-cierre-base.sql`; rol por `mi_rol` (`src/lib/insforge/server.ts:87`); `propietario_id()` para lo público |
| ARQ-02 SQL redefinido sin pruebas | **Parcial** | Mitigado: `db/funciones/` + test de inventario. Sigue: 135 `create function` para 96 nombres (26 redefinidos ≥2 veces: `portal_documento` 4, `panel_resumen` 4, `obtener_enlace` 4…); 68 `drop function`; CLI sin `down` (`npx insforge db migrations --help`: list/fetch/new/up); job `seguridad` del CI se salta sin secretos (`.github/workflows/ci.yml:50-56`) |
| ARQ-03 tipos manuales y casts | **Abierto** | `rg -o '\bas [A-Z]…' src` → 129; `src/types/database.ts` 319 líneas, 11 commits (archivo más cambiado de `src/`); `rg safeParse src/lib/datos src/app/w src/app/d` → solo en acciones (entrada), ninguna lectura `ws_*`/`portal_*` validada. CLI sin generación de tipos (`npx insforge db --help` no lista `types`) |
| ADR-01 monolito sin API | Cerrado | `madge` 0 ciclos; 3 Route Handlers (`src/app/api/{auth/refresh,cron/recordatorios,evento}`) |
| ADR-02 InsForge con plan de salida | **Parcial** | SDK en 7 archivos (3 fuera de `lib/insforge`); `auth.users` en 45 líneas de migraciones y en 5 funciones vigentes (`cobro_recordatorios_tomar`, `equipo_listar`, `contacto_aviso_empresa`, `invitacion_aceptar`, `ws_correo_usuario`); `ws_admin_set_password` sí retirada. Export semanal y simulacro: no verificable desde el repo |
| ADR-03 base como barrera | Cerrado con matiz | Las 25 `ws_*` son `security definer` y filtran por `ws_empresa_id()`; 7 no comprueban módulo (ARQ-006) |
| ADR-04 dinero en SQL | Parcial | Totales y numeración en triggers; pero tres cálculos de saldo (ARQ-001) y espejo TS sin paridad (ARQ-002) |
| ADR-05 un propietario | Cerrado | `propietario_id()`, `dueno_estudio()` en `db/funciones/` |
| ADR-06 respaldos | No verificable | `scripts/respaldo.mjs` existe; frecuencia, copia externa y simulacro están fuera del repo |
| ADR-07 inmutabilidad | **Cerrado** | `cotizacion_json.sql:11-14`, `acta_json`, triggers `*_aceptada_fija`, `*_items_fijos` en `db/funciones/` |
| ADR-08 comprobantes | Abierto | `rg -i comprobante src migrations` → solo texto de correo; sin tabla ni Storage |
| ADR-09 pruebas SQL en CI | Parcial | Inventario estático sí; e2e contra staging condicionado a secretos |
| ADR-10 observabilidad | Parcial / no verificable | `src/instrumentation*.ts` y `withSentryConfig` (`next.config.ts:46-53`); DSN, uptime y región de Vercel no están en el repo (`vercel.json` solo define el cron) |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | ARQ-001 |
| Título | Tres fórmulas distintas de "pendiente de pago" conviven y pueden mostrar cifras diferentes |
| Severidad | Alta |
| Evidencia | (1) FIFO por empresa en `db/funciones/deudas_cotizacion.sql:36-64` (cobros sueltos pagan lo que vence antes); (2) `saldo(total, cobrado)` ingenuo con solo cobros ligados: `src/components/documentos/vista-cotizacion.tsx:11` (vista y PDF del workspace/portal cuando no llega `pago`), `src/app/panel/cotizaciones/[id]/detalle.tsx:29`, `src/app/panel/cotizaciones/page.tsx:44` (cae a `saldo()` si no hay deuda); (3) agregado en página por moneda: `src/app/panel/clientes/[id]/page.tsx:45-50` suma aceptadas PEN menos cobros PEN. El propio comentario de `cotizaciones/page.tsx:43` reconoce la divergencia ("Pendiente como lo ve la base") |
| Impacto | Hecho: con un cobro suelto o repartido, la empresa puede ver en su cotización un pendiente distinto del que muestra el panel y del que dispara el recordatorio (`cobro_recordatorios_tomar` usa `deudas_cotizacion`). Negocio: reclamos de cobro y pérdida de confianza en el documento. |
| Recomendación | Una sola fuente: que `cotizacion_json_vivo` exponga `pendiente`/`vence_pago` desde `deudas_cotizacion()` y que `saldo()` en TS desaparezca de vistas y páginas (queda solo para la vista previa del formulario). Test de regresión con un cobro suelto. |
| Esfuerzo | M |
| Dependencias | ARQ-002, ARQ-003 |

| Campo | Contenido |
|---|---|
| ID | ARQ-002 |
| Título | Espejos TypeScript de lógica SQL sin prueba de paridad |
| Severidad | Media |
| Evidencia | `src/lib/cotizacion.ts:1-39` replica `cotizacion_item_importe` y `cotizacion_totales` (`db/funciones/*.sql`); `estadoEfectivo` (`cotizacion.ts:55-59`) replica el `case … 'vencida'` de `cotizacion_json_vivo.sql:17` y `vencer_cotizaciones`; `DeudaCotizacion` (`cotizacion.ts:96-108`) es la forma de `deudas_cotizacion`. `rg -i 'trigger|sql' tests/unit/cotizacion.test.ts` → vacío: los tests solo prueban el lado TS. `src/lib/informe.ts` es armado de texto sobre `panel_informe_periodo`: no duplica cálculo (correcto). |
| Impacto | Inferencia: hoy coinciden (redondeo mitad arriba en positivos en ambos), pero un cambio de IGV, descuento por línea o redondeo en una migración deja la vista previa del formulario distinta del total guardado sin que ningún test lo detecte. |
| Recomendación | Fixture compartido (`tests/fixtures/cotizaciones.json`) con casos y totales esperados, usado por el test TS y por una prueba RPC contra staging (`cotizacion_totales` vía insert) en el job `seguridad`. |
| Esfuerzo | S |
| Dependencias | ADR-09 (secretos del job `seguridad`) |

| Campo | Contenido |
|---|---|
| ID | ARQ-003 |
| Título | Contrato SQL→TS sin verificación: tipos manuales y 129 casts |
| Severidad | Media |
| Evidencia | `src/types/database.ts:1-5` ("se aplican al leer `as ClienteRow[]`"), 11 commits en 8 días; `WsCotizacion` (`src/lib/datos/workspace.ts:110-147`), `FichaJson`/`ActaJson`/`InformeJson` (`src/lib/documentos.ts:24-165`) escritos a mano frente a `cotizacion_json_vivo.sql:11-27`, `ficha_json.sql`…; `rpc<T>` devuelve `data as T` (`workspace.ts:209`), `portal.ts:20`. CLI sin `gen types`. |
| Impacto | Hecho: renombrar una clave en un `*_json` compila y falla en la pantalla de la empresa o en el PDF. La frontera más expuesta (workspace y portal, lo que ve el cliente) es la menos protegida. |
| Recomendación | Zod solo en la frontera externa: `WsCotizacionSchema`, `FichaJsonSchema`… en `src/lib/documentos.ts`, con `rpc<T>` que valide en desarrollo/test y pase en producción (o `safeParse` con reporte a Sentry). Generación de tipos no es viable con la CLI actual; un script sobre `insforge db tables --json` podría cubrir las tablas (supuesto: habría que comprobar el formato). |
| Esfuerzo | M |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-004 |
| Título | Migraciones solo hacia adelante que redefinen funciones; generadores de un solo uso |
| Severidad | Media |
| Evidencia | 25 migraciones, 6 310 líneas, del 13/10 al 20/10 (`git log --date=short -- migrations`); 135 definiciones / 96 funciones; `scripts/generar-cierre-base.mjs:14` y `generar-equipo.mjs:12` apuntan por URL a una migración concreta y reescriben sus secciones `<generado>` (knip los marca sin uso con razón). `CLAUDE.md` ("úsalos siempre") contradice que no sirven para una tabla nueva sin editar una migración ya aplicada. Sin `down`; sin snapshot de esquema. |
| Impacto | Inferencia: una migración fallida a medias en producción se repara a mano; una tabla nueva obliga a copiar a mano ~6 políticas + 2 triggers (el test de inventario cubre funciones, no políticas). Testabilidad: lógica crítica (aceptación, numeración, FIFO) solo se prueba contra staging. |
| Recomendación | (1) Convertir los generadores en `scripts/generar-politicas.mjs <tabla>` que emita el bloque estándar para pegar en la migración nueva, y un test que compare `db policies` de staging con la lista esperada. (2) Añadir `db/esquema.sql` volcado por `insforge db export --schema-only` tras cada migración (lectura, como `db/funciones/`). (3) Checklist expand/contract de 3 pasos en README (R-08). |
| Esfuerzo | M |
| Dependencias | ARQ-002 |

| Campo | Contenido |
|---|---|
| ID | ARQ-005 |
| Título | Costo de salida de InsForge: moderado, concentrado en auth |
| Severidad | Media |
| Evidencia | Portable tal cual: esquema, RLS, 95 funciones (`auth.uid()` en 28 funciones y el patrón PostgREST `.from/.rpc` son compatibles con Supabase). Atado: `@insforge/sdk/ssr` (`createServerClient`, `createAuthActions`, `updateSession`, `createRefreshAuthRouter`, `DEFAULT_ACCESS_TOKEN_COOKIE`: `src/lib/insforge/server.ts:3`, `middleware.ts:2`, `api/auth/refresh/route.ts:1`), formato de claims (`src/lib/insforge/jwt.ts`), `signUp` en modo servidor (`admin.ts:15`), 5 funciones que leen `auth.users` y 45 referencias en migraciones (`profiles`, correo de usuario). `client.ts` (navegador) no se usa. |
| Impacto | Opinión: migrar a Supabase ≈ 3–5 días (auth y cookies 2, `auth.users`/correo 1, CLI y staging 1, pruebas 1). A Postgres plano + Auth.js: 2–3 semanas. No urge; el disparador sigue siendo el del ADR-02. |
| Recomendación | Encapsular `auth.users` detrás de una sola función `usuario_correo(uuid)` y una vista `usuarios_app`; mover `createRefreshAuthRouter` y `landing.ts`/`invitacion` a `src/lib/insforge/*` para que el SDK quede en una carpeta. Documentar en `ARQUITECTURA.md` el mapa anterior como "plan de salida" verificable. |
| Esfuerzo | S (encapsular) / L (migrar) |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-006 |
| Título | Módulos del workspace: 7 funciones `ws_*` no comprueban el módulo activo |
| Severidad | Baja |
| Evidencia | `grep -L ws_modulo_activo db/funciones/ws_*.sql` → `ws_trabajos`, `ws_trabajo`, `ws_comentarios` (más 4 auxiliares). `ws_trabajos.sql:27` filtra por empresa y `visible_empresa`, no por `proyectos`; el 404 del módulo lo pone la página (`src/app/w/[slug]/proyectos/page.tsx:20`). |
| Impacto | Hecho: no hay fuga entre empresas. Inferencia: un usuario de empresa con el módulo Proyectos desactivado puede listar sus trabajos visibles llamando a la API con su token; contradice el principio "la base decide" del ADR-03. |
| Recomendación | Añadir `and public.ws_modulo_activo('proyectos')` en las tres y un caso en `seguridad.spec.ts` (módulo inactivo → vacío). |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-007 |
| Título | Rutas interceptadas `@modal`: 44 archivos espejo mantenidos a mano |
| Severidad | Baja |
| Evidencia | `find src/app/panel/@modal -type f` → 44 (24 `page.tsx` de una línea `export { default } from …`, 9 `layout.tsx`, 9 `loading.tsx`, `[...resto]`). Un módulo nuevo exige 3 archivos espejo; si se olvida, la página abre completa sin aviso. |
| Impacto | Mantenibilidad; no afecta datos. |
| Recomendación | Test que compare las rutas `nueva|nuevo|[id]|[id]/editar` de `src/app/panel/*` con las de `@modal` y falle si falta una. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-008 |
| Título | Next 15 → 16: cambios acotados, hacerlo aparte |
| Severidad | Media |
| Evidencia | Ramas `origin/dependabot/npm_and_yarn/next-16.4.0` y `eslint-config-next-16.4.0` abiertas; `npm audit --omit=dev` propone `next@16.4.2` (evidencia global). `src/middleware.ts` usa la convención `middleware` (en 16 pasa a `proxy`); `cookies()`/`headers()` ya se esperan con `await` (`rg 'cookies\(\)' src | rg -v await` → vacío); `after()` en 3 sitios (`src/lib/correo/avisos.ts:37`, `src/app/acciones.ts:53`, `src/app/w/[slug]/layout.tsx:29`), estable desde 15.1; `serverExternalPackages` y `outputFileTracingIncludes` (`next.config.ts:30-45`) siguen válidos; `distDir` por variable para `.next-verify`. |
| Impacto | Inferencia: renombrar `middleware.ts` → `proxy.ts` (el matcher no cambia), revisar `withSentryConfig` 11 con Next 16 y el build con Turbopack por defecto (@react-pdf externalizado, debería pasar). Supuesto: `@insforge/sdk/ssr/middleware` solo toca cookies de request/response, compatible. |
| Recomendación | PR aislado: subir `next` + `eslint-config-next`, renombrar a `proxy.ts`, `NEXT_DIST_DIR=.next-verify next build`, correr tests PDF (`*.node.test.tsx`) y los 13 e2e contra staging antes de mergear. Resuelve de raíz las 2 vulnerabilidades de `postcss` anidado. |
| Esfuerzo | M |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-009 |
| Título | Listados con tope silencioso y filtro posterior |
| Severidad | Baja |
| Evidencia | `src/lib/datos/cotizaciones.ts:21-26` (`limit(200)`) y luego `src/app/panel/cotizaciones/page.tsx:39-46` filtra `vencida`/`enviada` en memoria; `panel_resumen` acota por bloque (correcto). |
| Impacto | A 50 empresas × ~4 cotizaciones/año se alcanza en 1 año; las más antiguas desaparecen del filtro sin aviso. Escalabilidad general: `ws_*` y `panel_resumen()` con subconsultas correlacionadas van bien a esta escala (<10 k filas); latencia dominada por la red, no por la base (supuesto: funciones de Vercel en `iad1`, no verificable aquí). |
| Recomendación | Paginar o marcar `vencida` en la base (`vencer_cotizaciones` ya existe) para filtrar en SQL; mostrar "mostrando 200 de N". |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | ARQ-010 |
| Título | Código muerto y lógica en páginas grandes |
| Severidad | Baja |
| Evidencia | knip: `src/lib/insforge/client.ts` sin uso aunque existe `/api/auth/refresh` para él; `@radix-ui/react-tabs` + `ui/tabs.tsx`; 46 exports (4 en `lib/datos`: `cobrosDeCliente`, `cotizacionesParaCobro`, `listarFichas`, `trabajosDeCliente`). Páginas con agregación de negocio: `src/app/panel/clientes/[id]/page.tsx` (411 líneas, 24 dependencias según madge, 11 commits), `src/app/panel/page.tsx` (427), `formulario-ficha.tsx` (476). |
| Impacto | Ruido y superficie sin tests; la lógica de `clientes/[id]` (saldos, atrasos) debería vivir en `lib/datos/inicio.ts`-estilo o en SQL (ver ARQ-001). |
| Recomendación | Borrar `client.ts` y la ruta de refresh si no habrá cliente de navegador (o documentar por qué se conserva); quitar exports muertos; mover los agregados de `clientes/[id]` a una función `cliente_resumen(id)`. |
| Esfuerzo | S |
| Dependencias | ARQ-001 |

## Supuestos y preguntas abiertas

- **Supuesto:** las funciones de Vercel corren en `iad1` junto a InsForge (us-east); `vercel.json` no fija región. Confirmar en el panel de Vercel antes de cualquier decisión de latencia.
- **Supuesto:** `@sentry/nextjs` 11 y `@insforge/sdk/ssr` son compatibles con Next 16; solo se comprueba con el build del PR (ARQ-008).
- **Pregunta abierta:** ¿se conservará un cliente de navegador (`client.ts`) para alguna función futura (realtime, subida de archivos en fase 16)? Define si `/api/auth/refresh` se queda o se va.
- **Pregunta abierta:** ¿la CLI de InsForge ofrece `db tables --json` con tipos de columna suficientes para generar `database.ts`? No se probó (solo lectura, sin ejecutar contra staging más allá de `--help`).
- **Pregunta abierta:** ¿hay cobros sueltos (sin `cotizacion_id`) en producción? Determina si ARQ-001 ya está produciendo cifras distintas hoy.
- **No verificable desde el repo:** respaldos (ADR-06), DSN de Sentry y uptime (ADR-10), configuración de Auth de producción.
