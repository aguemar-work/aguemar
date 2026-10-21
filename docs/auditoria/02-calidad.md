# 02 · Calidad de código

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · Perfil: Tech Lead / calidad de código · Solo lectura.

## Diagnóstico general

Base sana para diez días de vida: `tsc` y `eslint` limpios, 154 tests en verde, 0 ciclos (madge), 0 `any` reales, español consistente y un patrón `Resultado<T>` seguido en 18 de 19 `acciones.ts`. Los problemas no son de estilo sino de **bordes**: (1) 164 `catch (e)` en Server Actions convierten cualquier excepción en `fallo()` sin avisar a Sentry, así que los errores inesperados no se ven; (2) lo que vuelve de `rpc()`/`from()` se castea a tipos manuales (97 `data as`), sin validación, incluidos documentos, aceptaciones y montos; (3) la configuración de calidad es la mínima de Next (sin reglas type-aware, sin formato automático, sin hooks), lo que hace que todo lo anterior dependa de la disciplina de una sola persona.

## Fortalezas

- **Tipado estricto real**: `rg '\bany\b' src` → 3 coincidencias, todas strings (`step="any"`, texto en inglés); `tsconfig.json:11` `strict: true`; `@typescript-eslint/no-explicit-any` en error (`--print-config`).
- **Patrón uniforme de acciones**: `src/lib/datos/resultado.ts` (`exito`/`fallo`/`SinSesionError`/`SinPermisoError`) usado en 18/19 `acciones.ts`; la excepción, `src/app/(auth)/acciones.ts`, usa `EstadoLogin`/`EstadoRecuperacion` porque alimenta `useActionState` (justificado).
- **Traducción centralizada de errores** (`src/lib/insforge/errores.ts:38-85`): 173 llamadas a `traducirError`; 95 de 99 `raise exception` de las migraciones llevan `errcode` y llegan en español.
- **Formularios homogéneos**: los 10 formularios del panel comparten `Campo`/`propsCampo`, `BarraAcciones`, `useAvisoCambios` y `usePanelLateral` (conteo por archivo con `rg`); `src/components/formulario/*`.
- **Correo desacoplado**: `src/lib/correo/avisos.ts:29-41` envuelve cada aviso en `after()` con `catch` → `console.error` + `Sentry.captureException`; nunca bloquea la acción.
- **Optimismo con revert correcto**: `plan.tsx:48-65`, `marcar-hecha.tsx:10-23`, `modulos.tsx:17`, `pago.tsx:41`: `useOptimistic` dentro de `useTransition`; si `!r.ok` solo hay `toast.error` y React vuelve al valor del servidor (no hace falta revert manual).
- **Convenciones**: `rg agueMar` fuera del `.ps1` → 0; 15 `console.*`, todos en servidor con prefijo (`[correo]`, `[lead]`, `[pdf]`, `[recordatorios]`) o en `useReportarError`; 3 `eslint-disable` justificados (QR como data URL, OG image, `Image` de react-pdf sin `alt`).
- **Código vivo**: 0 ciclos en 334 archivos; `src/lib/datos/busqueda.ts` e `ipDe()` cierran duplicaciones anteriores.

## Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| COD-01 Configuración muerta (`INSFORGE_API_KEY`, `CRON_SECRET`, `LEADS_NOTIFY_TO`) | **Cerrado** | `rg 'INSFORGE_API_KEY\|LEADS_NOTIFY_TO' src .env.example` → 0; `src/lib/env.ts:45-47` solo lee `AVISOS_PARA` y `CRON_SECRET`; `CRON_SECRET` ahora se usa en `src/app/api/cron/recordatorios/route.ts:20-26`. |
| COD-02 IP duplicada + errores crudos | **Parcial** | IP: cerrado, `ipDe()` en `src/lib/ip.ts:6` usado por `src/app/acciones.ts:47` y `src/app/d/[token]/acciones.ts:31`. Error crudo: abierto, `src/lib/insforge/errores.ts:84` sigue devolviendo `No se pudo completar: ${e.message}`; además `src/app/(auth)/acciones.ts:56,115,197` interpolan `error.message` del SDK. |
| COD-03 Archivos grandes | **Abierto (empeoró)** | `git ls-files src \| xargs wc -l`: `formulario-ficha.tsx` 443→476, `panel/page.tsx` 410→427, `clientes/[id]/page.tsx` 342→411 (11 commits, el de mayor churn), `plan.tsx` 347→356. |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | COD-001 |
| Título | Las Server Actions tragan excepciones inesperadas sin registrarlas en ningún sitio |
| Severidad | Media |
| Evidencia | `rg -c 'return fallo\(traducirError' src/app` → 164; patrón en `src/app/panel/trabajos/acciones.ts:48-50` (`catch (e) { return fallo(traducirError(e).mensaje); }`); `rg -l Sentry src/app --glob acciones.ts` → solo `src/app/acciones.ts`; `src/instrumentation.ts:10` (`onRequestError = Sentry.captureRequestError`) solo ve errores **no** atrapados. |
| Impacto | Hecho: un bug, un timeout de InsForge o un fallo de RLS en cualquier acción del panel/workspace se convierte en un toast y desaparece; Sentry (ADR-10) queda ciego justo donde ocurre el trabajo. Negocio: aceptaciones, cobros o publicaciones que fallan "a veces" no se pueden diagnosticar. |
| Recomendación | Un envoltorio en `resultado.ts`, p. ej. `accion(async () => …)` que haga `try/catch`, `traducirError` y `Sentry.captureException(e, { tags: { accion } })` cuando el error no esté en la lista conocida (códigos 23xxx/42501/PGRST/P0002…). Migrar los 164 sitios con un `sed` guiado; ESLint `no-restricted-syntax` para `catch` que devuelva `fallo()` sin pasar por el envoltorio. |
| Esfuerzo | M |
| Dependencias | COD-002 (misma función); PER/DevOps (DSN de Sentry pendiente). |

| Campo | Contenido |
|---|---|
| ID | COD-002 |
| Título | Mensajes crudos de Postgres y del SDK llegan a la pantalla |
| Severidad | Baja |
| Evidencia | `src/lib/insforge/errores.ts:84`; `src/app/(auth)/acciones.ts:56,115,197`; `migrations/20261013171444_funciones.sql:21,24` y `20261015150431_fichas-portal.sql:28,31` (`raise exception` sin `errcode` → código P0001, no listado en `errores.ts:75`, cae al mensaje crudo). |
| Impacto | Hecho: un error no previsto muestra nombres de tabla/columna/restricción en el toast y a veces en inglés (fuga menor de estructura; la RLS impide usarla). Inferencia: baja probabilidad hoy, porque 95/99 `raise` llevan `errcode`. |
| Recomendación | Mensaje genérico con un identificador corto (`No se pudo completar (ref. a1b2)`) y el detalle solo al log/Sentry (COD-001); añadir `P0001` a la lista de códigos "propios" si se quiere que los `raise` sin `errcode` sigan saliendo en español. |
| Esfuerzo | S |
| Dependencias | COD-001. |

| Campo | Contenido |
|---|---|
| ID | COD-003 |
| Título | Lo que vuelve de la base se castea a tipos manuales sin validar |
| Severidad | Media |
| Evidencia | `rg 'data as ' src` → 97; `rg 'as unknown' src` → 5; `src/types/database.ts:1-5` ("alineados a migrations/*.sql", mantenidos a mano, 319 líneas); `rg 'safeParse\|parse(' src/lib/datos` → 0. Los 10 casts más arriesgados: (1) `src/lib/datos/workspace.ts:204-210` `rpc<T>` genérico que cubre **todas** las `ws_*`; (2) `src/lib/datos/portal.ts:20` `data as DocumentoPortal` (portal público y aceptación); (3) `src/lib/datos/inicio.ts:47` `data as ResumenInicio` (montos del dashboard); (4) `src/lib/datos/cotizaciones.ts:56` `data as CotizacionDetalle` (PDF y aceptación); (5) `src/lib/datos/cotizaciones.ts:107` cast inline con `cobros`; (6) `src/app/panel/cotizaciones/acciones.ts:128` `CotizacionRow & { cotizacion_items… }` (duplicar cotización); (7) `src/lib/datos/fichas.ts:47` `data as FichaEdicion`; (8) `src/lib/correo/avisos.ts:148-157` destino del correo; (9) `src/lib/datos/leads.ts:32` y (10) `src/lib/datos/briefs-actas.ts:131-133` `as unknown as X[]` (doble cast: la forma inferida ya no coincide). |
| Impacto | Hecho: Zod protege lo que **entra** (`src/lib/validators/*`) pero no lo que **sale** de `rpc("ws_*")`/`*_json`. Inferencia: un cambio de columna en una función SQL (25 migraciones en 7 días) no rompe `tsc` ni los tests unitarios; se nota en producción como `undefined` en un PDF, un monto `NaN` o un workspace en blanco. Negocio: documentos y cobros son justo lo que la empresa cliente ve. |
| Recomendación | Esquemas Zod para las formas compartidas (`ficha_json`, `cotizacion_json`, `acta_json`, `informe_json`, `panel_resumen`, `ws_*`) con `z.infer` reemplazando los tipos manuales; validar con `safeParse` y, si falla, reportar (COD-001) y devolver `null`. Empezar por portal, cotizaciones e inicio (3 archivos). Alternativa: generar `database.ts` desde la base si la CLI lo permite (pregunta abierta). |
| Esfuerzo | M (bordes críticos) / L (todo). |
| Dependencias | ARQ (ADR-02 acoplamiento a InsForge); QA (tests de contrato contra staging). |

| Campo | Contenido |
|---|---|
| ID | COD-004 |
| Título | Tres hotspots siguen creciendo y mezclan responsabilidades |
| Severidad | Baja |
| Evidencia | `src/app/panel/fichas/formulario-ficha.tsx` (476): un componente con 5 `useFieldArray` (l. 105-109), 6 tarjetas, 4 `watch` y el callback `onAplicar` (l. 148-168) con tres ramas de importación y `Object.fromEntries(...) as FichaInput["equipo_datos"]` repetido (l. 152, 158); `src/app/panel/clientes/[id]/page.tsx` (411, 11 commits): 7 secciones + cálculo de saldo/vencido en la página (l. 47-53) cuando `deudasCotizacion` ya lo devuelve; `src/app/panel/page.tsx` (427): 8 tarjetas inline y `Alerta`/`Vacio` locales. `plan.tsx` (356), `avisos.ts` (310) y `acciones-documento.tsx` (309) están bien divididos en subcomponentes/funciones y no requieren acción. |
| Impacto | Opinión: legibilidad y riesgo de regresión al tocar cobros o fichas (los dos archivos con más cambios); hoy sin bug detectado. |
| Recomendación | Extraer `SeccionCobros` y `SeccionHistorial` de la ficha de empresa, `CamposEquipo` e `ImportarEnFormulario` de la ficha técnica, y las tarjetas del inicio a `src/components/panel/inicio/*`; fijar un tope orientativo (300 líneas) en CLAUDE.md. |
| Esfuerzo | M |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | COD-005 |
| Título | El cierre tras guardar está copiado en 8 formularios |
| Severidad | Baja |
| Evidencia | `rg -n 'if \(panel && ' src/app/panel --glob 'formulario-*.tsx'` → 8 bloques idénticos (`formulario-trabajo.tsx:67-69`, `-cliente.tsx:65-67`, `-cotizacion.tsx:116-118`, `-informe.tsx:106-108`, `-equipo.tsx:74-76`, `-ficha.tsx:130-132`, `-acta.tsx:73-75`, `-brief.tsx:81-83`), cada uno precedido de `toast.success` + `form.reset(datos as XInput, { keepValues: true })`. |
| Impacto | Hecho: cualquier cambio del panel lateral (p. ej. abrir el detalle en vez de cerrar) exige tocar 8 archivos; `formulario-cliente.tsx:67` ya diverge (`volverA`). |
| Recomendación | `useGuardarYSalir({ editando, rutaDetalle })` junto a `usePanelLateral()` en `src/components/panel/panel-lateral.tsx` que encapsule toast, reset y navegación. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | COD-006 |
| Título | Guardarraíles de calidad mínimos: sin reglas type-aware, sin formato ni hooks |
| Severidad | Baja |
| Evidencia | `eslint.config.mjs:13` solo `next/core-web-vitals` + `next/typescript`; `npx eslint --print-config src/app/page.tsx` → `no-floating-promises` OFF, `no-misused-promises` OFF, `import/order` OFF, `no-console` OFF, 6 reglas `jsx-a11y` (las de Next); `tsconfig.json` sin `noUncheckedIndexedAccess` ni `exactOptionalPropertyTypes`, `target ES2017` (irrelevante: Next compila con su propio target); `ls .husky .prettierrc* .editorconfig` → no existen; `package.json` sin `prettier`/`lint-staged`. Promesas sueltas hoy controladas a mano (`void fetch` en `medicion.tsx:46`, `void segura()` en `avisos.ts:39`). |
| Impacto | Inferencia: con un solo autor y PRs de Dependabot, un `await` olvidado en una acción (p. ej. revalidar antes de responder) pasa CI; el formato depende del editor. |
| Recomendación | `parserOptions.projectService: true` + `@typescript-eslint/no-floating-promises` y `no-misused-promises` (una tarde de falsos positivos); Prettier con `--check` en `ci.yml`; `lint-staged` con `husky` o, si se prefiere sin hooks, solo CI. `noUncheckedIndexedAccess` es opcional (muchos `[0]` en validators). |
| Esfuerzo | S (lint) / M (con formato de todo el repo en un commit aparte). |
| Dependencias | DevOps (CI). |

| Campo | Contenido |
|---|---|
| ID | COD-007 |
| Título | Código muerto confirmado y falsos positivos de knip |
| Severidad | Baja |
| Evidencia | `npx knip` (evidencia global): **verdaderos positivos**: `src/lib/insforge/client.ts` (0 referencias, `rg 'insforge/client"' src tests` → 0), `src/components/ui/tabs.tsx` + dependencia `@radix-ui/react-tabs`, y 6 funciones de datos sin consumidor (`eliminarComentario` `bandeja/acciones.ts:57`, `cobrosDeCliente`/`cotizacionesParaCobro` `datos/cotizaciones.ts:77,89`, `listarFichas` `datos/fichas.ts:12`, `trabajosDeCliente` `datos/trabajos.ts:71`, `contarNoLeidos` `datos/comentarios.ts:37`). **Falsos positivos**: `eslint-config-next` (lo carga `FlatCompat`, `eslint.config.mjs:13`); `Documento*` de `src/lib/pdf/*` (los tests importan `pdfFicha`/`pdfCotizacion`…, que los usan internamente: sobra el `export`, no la función); `scripts/generar-*.mjs` (generadores de migraciones ya aplicadas, citados en CLAUDE.md fases 13-14: histórico, no muerto); `@testing-library/*` (no hay tests de componentes: es un hueco de QA, no de knip). |
| Impacto | Hecho: `eliminarComentario` es una Server Action exportada sin UI (superficie que la RLS debe cubrir aunque nadie la llame); `client.ts` crea un cliente de InsForge en el navegador que el proyecto decidió no usar. |
| Recomendación | Borrar `client.ts`, `tabs.tsx` y `@radix-ui/react-tabs`; quitar los 6 loaders/acciones sin uso o enlazarlos; quitar `export` de `Documento*`; `knip` en CI con `ignore` para `scripts/generar-*` y `ignoreDependencies: ["eslint-config-next"]`. |
| Esfuerzo | S |
| Dependencias | SEC (acciones exportadas sin UI). |

| Campo | Contenido |
|---|---|
| ID | COD-008 |
| Título | El validador de Mi marca deja pasar `[PENDIENTE…]` hasta páginas públicas |
| Severidad | Baja |
| Evidencia | `src/lib/validators/marca.ts:18,22` (`v.startsWith("[PENDIENTE")` exime RUC y correo); `src/app/privacidad/page.tsx:34-37` y `src/lib/pdf/base.tsx:186` muestran el marcador si falta el dato. |
| Impacto | Opinión: atajo razonable para arrancar, pero un RUC `[PENDIENTE: RUC]` puede salir en `/privacidad` y en el pie de un PDF enviado a un cliente. |
| Recomendación | Aviso en Mi marca ("tu RUC sigue pendiente") y un test que falle si la marca de producción conserva el marcador; o retirar la exención ahora que hay datos reales (supuesto). |
| Esfuerzo | S |
| Dependencias | UX/LEG. |

## Supuestos y preguntas abiertas

- **Supuesto**: producción ya tiene `perfil_marca` completo (sin `[PENDIENTE`); no se puede comprobar desde el repo (COD-008).
- **Supuesto**: Sentry sin DSN propio (fase 15 pendiente); COD-001 importa igual porque, aun con DSN, los `catch` no reportan.
- **Pregunta abierta**: ¿la CLI de InsForge puede generar tipos TypeScript desde el esquema? Cambia la recomendación de COD-003 (generar vs. Zod).
- **Pregunta abierta**: ¿se quiere `husky` (hooks locales) o solo CI? Afecta COD-006.
- **No verificable**: complejidad ciclomática medida (sin herramienta autorizada); los valores de tamaño/estado son `wc -l`, `rg` y lectura directa.
- **Fuera de alcance aquí**: `src/lib/insforge/jwt.ts` lee claims sin verificar firma (lo cubre SEC); cobertura de tests (QA).
