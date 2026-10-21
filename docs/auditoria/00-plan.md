# 00 · Plan de auditoría integral — aguemar Studio

> Fase 0, aprobada el 20/10/2026 con tres ajustes de Alejandro (ver §6). Auditoría de solo lectura: solo se escribe en `docs/auditoria/`. No se ejecutan migraciones, deploys, `git push` ni el servidor de desarrollo.

## 1. Resumen del proyecto (hechos verificados en el repo)

- **Qué es:** sistema de un estudio unipersonal peruano (diseño, desarrollo, soporte técnico): landing pública (`/`, `/en`), panel privado (`/panel/*`, propietario y colaboradores) y workspace por empresa cliente (`/w/[slug]/*`), más portal por token (`/d/[token]`) e invitaciones (`/invitacion/[token]`).
- **Para quién:** Alejandro (propietario), colaboradores, un usuario por empresa cliente, visitantes de la landing.
- **Stack detectado** (`package.json`): Next.js 15.5.27 (App Router, Turbopack, rutas interceptadas `@modal`), React 19.3, TypeScript estricto, Tailwind v4 (`@theme` en `src/app/globals.css`), Radix (dialog, dropdown, label, slot, tabs) + componentes propios, React Hook Form + Zod 4, `@react-pdf/renderer` 4, InsForge (`@insforge/sdk` 1.5, Postgres + RLS, Auth, Storage), Resend por REST, Sentry 11, Vercel (cron diario en `vercel.json`), Vitest 5, Playwright 1.64. Node 24.21.
- **Tamaño:** 340 archivos en `src/`, ~24 900 líneas TS/TSX/CSS (`src/app` 14 682, `src/lib` 6 169, `src/components` 3 721); 25 migraciones SQL (6 310 líneas, 13–20/10/2026); 95 funciones SQL volcadas en `db/funciones/`; 30 archivos de tests unitarios + 13 specs e2e (2 921 líneas); 56 commits desde el 10/10/2026 (diez días de vida, un solo autor más Dependabot).
- **Entornos:** rama `staging` de InsForge (local, e2e) y proyecto principal (producción); Vercel despliega en cada push a `main` tras CI (`.github/workflows/ci.yml`: tipos, lint, vitest, `npm audit` informativo, build; job `seguridad` contra staging que se salta si faltan secretos). Dependabot semanal.
- **Secretos:** `.env.local`, `.env.local.bak-produccion`, `.insforge/` y `_respaldos/` existen en disco y están ignorados por git (`git check-ignore -v`; `git ls-files` no los lista). Ninguno está commiteado en HEAD. El historial completo se revisa en Fase 1 (SEC).
- **Estado declarado por el proyecto** (`CLAUDE.md`, `README.md`): fases 1–14.5 cerradas; fase 15 a medias (Sentry sin DSN propio, uptime, CSP en modo reporte); fase 16 (comprobantes, portafolio) sin empezar.
- **Evaluaciones previas del propio proyecto:** `AUDITORIA.md` (16/10, sobre `c81d9b4`, 43 hallazgos, nota 62/100), `PLAN-AUDITORIA.md` (16/10) y `ARQUITECTURA.md` (19–20/10, ADR-01..10, riesgos R-01..R-11). Esta auditoría no las repite: **verifica con evidencia nueva** qué quedó cerrado y cubre lo que ninguna tocó (ejecución en vivo, accesibilidad probada, bundle, producto, gestión, legal).

## 2. Áreas a auditar y descartes

| Área | Decisión | Motivo |
|---|---|---|
| Arquitectura, calidad, AppSec, performance/DevOps, QA, UX/UI, accesibilidad, SEO, producto, gestión | **Se auditan** | Aplican todas |
| CORS | Dentro de AppSec, acotado | No hay API pública propia salvo `/api/evento` (anónima) y `/api/cron`; el resto son Server Actions y PostgREST de InsForge |
| Métricas reales de producción (CWV de campo, uptime, errores de Sentry, tráfico) | **No determinables desde el código** | Supuesto / pregunta abierta |
| Revisión en pantalla (axe, Lighthouse, responsive, modo oscuro) | **No verificado en esta pasada**: el dev server no está corriendo (`curl localhost:3000` → sin respuesta el 20/10) y el repo prohíbe que Claude lo arranque | Se hace revisión estática del código y se marca "no verificado en pantalla"; queda como paso del plan de acción |
| Internacionalización fuera de la landing | Se descarta | Panel y workspace son solo español por diseño |
| Infra de InsForge (región, plan, backups en consola) | Solo lo verificable con `@insforge/cli` de lectura | Lo demás es pregunta abierta |
| Legal (Ley 29733, ANPD, Libro de Reclamaciones) | Se revisa lo que el código muestra (`/privacidad`, `[PENDIENTE]`); el resto queda como pregunta abierta | No somos asesoría legal |

## 3. Plan por perfil

IDs: `ARQ`, `COD`, `PRO`, `PM`, `UX`, `A11Y`, `SEC`, `PER`, `QA`, `SEO`. Cada informe (~150 líneas máximo) lleva una tabla "Hallazgos previos verificados" donde cada "cerrado" cita evidencia propia (archivo:línea o comando + salida); si no hay evidencia, queda "no verificado".

| Nº | Perfil | Qué revisa (foco) | Archivos / módulos | Comandos de análisis |
|---|---|---|---|---|
| 01 | Arquitecto | capas `datos/*` vs `acciones.ts` (19 Server Actions), `workspace.ts` solo `rpc("ws_*")`, patrón `*_json`/`*_json_vivo`/`*_contenido` compartido por panel, workspace, portal y PDF; `@modal`; acoplamiento a InsForge (ADR-02); duplicación `src/lib/cotizacion.ts` ↔ triggers SQL; 96 `as X` y `src/types/database.ts` manual; `env.ts` | `src/lib/**`, `src/app/panel/*/acciones.ts`, `migrations/`, `db/funciones/` | `npx madge --circular`, `git log --stat` (churn), `rg` de imports entre capas |
| 02 | Tech Lead | 10 archivos más grandes (`formulario-ficha.tsx` 476, `panel/page.tsx` 427…); 75 `catch (e)` y 18 `catch {}`; `traducirError` devuelve mensaje crudo de Postgres (`errores.ts:83`); 3 `eslint-disable`; 15 `console.*`; `validators/marca.ts` acepta `[PENDIENTE…]`; ESLint sin reglas propias | `src/**`, `eslint.config.mjs`, `tsconfig.json` | `npm run typecheck`, `npm run lint`, `npx knip` |
| 03 | Product Owner | flujo lead → empresa → cotización → aceptación → trabajo → documentos → cobro → recordatorio; completo vs a medias; huecos (identidad en aceptación, comprobantes, cotización editada tras enviarse, colaborador); módulos y perfiles de acceso; valor para la empresa | `src/app/**/page.tsx`, `nav.ts`, `modulos.ts`, `landing-contenido.ts` | ninguno (lectura) |
| 04 | Project Manager | historial git (un autor, bus factor 1), fases vs código, deuda registrada, dependencias externas y sus planes gratuitos, riesgos R-01..R-11, documentación, protección de rama, proceso de incidentes | `README.md`, `CLAUDE.md`, `ARQUITECTURA.md`, `.github/` | `git log`, `git shortlog -sn` |
| 05 | UX/UI | tokens y 14 componentes `ui/` (`select`/`switch` propios), `EmptyState` (26 usos), `esqueleto`, panel lateral, estados por segmento (faltan en `d/[token]`, `login`, `invitacion`, `sin-acceso`, subrutas de `w/[slug]`; un solo `not-found.tsx`), microcopy y `[PENDIENTE]` visibles, flujos clave, landing, modo oscuro, 360 px, PDF | `src/components/**`, `src/app/**/(loading|error|not-found).tsx`, `globals.css` | revisión estática (sin pantalla) |
| 06 | Accesibilidad | WCAG 2.2 AA: skip link (ausente en `d/[token]`, por confirmar en `login`), foco global y contraste de tokens (recalculado), `lang` fijo `es-PE` en `/en`, 41 botones `size="icon"`, `brackets.tsx` svg sin `aria-hidden`, inputs fuera de `Campo`, `select`/`switch` propios, Sheet/Dialog, tablas, toasts, reduced motion, target size 24×24, focus not obscured con barras sticky | `src/components/ui/*`, `formulario/campo.tsx`, `globals.css`, landing | script Node de contraste en scratchpad (lee `globals.css`); `rg` de patrones ARIA |
| 07 | AppSec | OWASP A01–A10: RLS + `exigirPropietario` en las 19 acciones; `ws_*`/`portal_*` con `revoke anon` y `search_path`; tokens de portal e invitación; `jwt.ts` sin verificar firma; `busqueda.ts` vs inyección en `.or()`; JSON-LD con `dangerouslySetInnerHTML`; `crear_lead` y `/api/evento` (sin límite en app, `Origin` opcional); cabeceras (`next.config.ts`, CSP Report-Only con `unsafe-inline`); middleware solo por cookie; auth InsForge; `ip.ts`; cron; secretos en historial; `.env.local.bak-produccion` | `src/lib/insforge/*`, `src/middleware.ts`, `src/lib/csp.ts`, `src/app/api/**`, `migrations/`, `db/funciones/` | `npm audit`, `git log -p -S` con patrones, `npx @insforge/cli` (advisor, solo lectura, contexto staging), `tests/unit/migraciones.node.test.ts` |
| 08 | Performance/DevOps | First Load por ruta (`next build` en `.next-verify`), `outputFileTracingIncludes` (12 rutas PDF), fuentes e imágenes, landing estática, `Promise.all`, `panel_resumen()`/`deudas_cotizacion()` e índices, latencia us-east (PER-02), caché de PDF, CI (job `seguridad` saltado), respaldos (plan gratuito, sin `auth.users`, sin simulacro), observabilidad (Sentry sin DSN, sin uptime, cron sin alerta) | `next.config.ts`, `ci.yml`, `vercel.json`, `scripts/`, `migrations/*indices*` | `NEXT_DIST_DIR=.next-verify npx next build`, `npm ls --depth=0` |
| 09 | QA | 30 unit + 13 e2e; sin cobertura medida; sin tests de componentes; e2e solo Chromium, sin `webServer`, fuera de CI; casos críticos sin cubrir (aceptación concurrente, invitación reusada, colaborador borrando, módulo inactivo, cron, recordatorios duplicados, PDF vacío, token revocado) | `tests/**`, `vitest.config.mts`, `playwright.config.ts` | `npm test`, `npx playwright test --list` |
| 10 | SEO | `landing-meta.ts` (canonical, hreflang), `lang` fijo, `robots.ts`, `sitemap.ts`, una sola OG image, twitter card, JSON-LD (revisión manual contra schema.org), h1/h2, 404 real, `noindex` en `/d`, SEO-02 (páginas por servicio) | `src/app/(layout|page|robots|sitemap|opengraph-image).tsx`, `src/lib/landing-meta.ts`, `components/landing/*` | lectura; `curl -sI` no disponible sin servidor |

## 4. Orden de ejecución y por qué

1. **Comandos globales una vez** (tipos, lint, tests, audit, build en `.next-verify`, madge, knip, secretos en historial): alimentan a varios perfiles y fijan la línea base.
2. **07 Seguridad → 01 Arquitectura → 08 Performance/DevOps:** la seguridad fija la severidad máxima; la arquitectura explica causas raíz; DevOps comparte evidencia de CI, entornos y respaldos.
3. **02 Calidad → 09 QA:** comparten la lectura de `acciones.ts` y de los tests.
4. **06 Accesibilidad → 05 UX/UI → 10 SEO:** comparten componentes base y landing.
5. **03 Producto → 04 Gestión:** sintetizan huecos y riesgos detectados por los demás.
6. **90 Síntesis → 99 Plan de acción → README** (Fases 2 y 3). Priorización con **MoSCoW + esfuerzo** (un equipo de una persona sin datos de alcance para RICE).

## 5. Preguntas y respuestas

Las respuestas llegaron con los corchetes sin rellenar, así que todo se trata como **supuesto** o **pregunta abierta** y se consolida en `99-plan-de-accion.md` §6.

| Nº | Pregunta | Estado | Supuesto de trabajo |
|---|---|---|---|
| 1 | Empresas y colaboradores reales; ¿hay aceptaciones en producción? | Abierta | Pocas empresas (≤5), producción con datos reales desde el 20/10 |
| 2 | Objetivo a 3 meses: captar / operar / cobrar | Abierta | Las tres a la vez; se prioriza lo que protege datos y cobros |
| 3 | Comprobantes: SUNAT, recibo por honorarios o solo PDF; régimen tributario | Abierta | Solo adjuntar PDF en la primera versión |
| 4 | Aceptación con nombre + DNI sin verificación: ¿aceptable? | Abierta | Aceptable para montos bajos; riesgo legal registrado |
| 5 | Autorización de clientes para el portafolio | Abierta | No hay; el portafolio sigue anónimo |
| 6 | Acceso a Vercel, Sentry, InsForge (plan, región, respaldos, Auth) | Abierta | Vercel Hobby, InsForge gratuito, Sentry sin DSN propio |
| 7 | `main` protegida; secretos `STAGING_*`/`E2E_*` en GitHub | Abierta | No protegida; secretos sin cargar (el job `seguridad` se salta) |
| 8 | Último `db:respaldo` y copia fuera del equipo; simulacro | Abierta | `_respaldos/` tiene exports del 20/10; sin copia externa ni simulacro |
| 9 | Dev server corriendo durante la auditoría | **No** (verificado) | Sin revisión en pantalla |
| 10 | `next build` en `.next-verify` y `npm test` | Autorizado (comandos de análisis aprobados) | Se ejecutan |
| 11 | e2e `seguridad` y `equipo` contra staging | Abierta | **No se ejecutan** (escriben en staging y necesitan cuentas) |
| 12 | gitleaks | Abierta | Solo `git log -S` con patrones |
| 13 | Horas/semana y fechas clave | Abierta | ~10 h/semana, sin fecha dura |
| 14 | Solo o con otra persona | Abierta | Solo |
| 15 | Asesoría legal Ley 29733 | Abierta | No hay; se registra como riesgo |

## 6. Ajustes de Alejandro a este plan

1. **Verificación adversarial:** ningún hallazgo de `AUDITORIA.md` o `ARQUITECTURA.md` se da por cerrado porque el documento lo diga; cada "resuelto" necesita evidencia nueva. Se audita como externo, no como autor.
2. **Proporcionalidad:** cada informe de perfil, ~150 líneas como máximo; hallazgos con impacto real antes que exhaustividad; el valor principal va en `99-plan-de-accion.md`.
3. **Herramientas:** solo `madge`, `knip` y `@insforge/cli` (lectura) vía `npx`. Sin `structured-data-testing-tool` ni `dependency-cruiser`.
4. `.env.local.bak-produccion` lo gestiona Alejandro; se registra igual como hallazgo.

## 7. Índice previsto

`00-plan.md` · `01-arquitectura.md` · `02-calidad.md` · `03-producto.md` · `04-gestion.md` · `05-ux-ui.md` · `06-accesibilidad.md` · `07-seguridad.md` · `08-performance-devops.md` · `09-qa.md` · `10-seo.md` · `90-sintesis.md` · `99-plan-de-accion.md` · `README.md`
