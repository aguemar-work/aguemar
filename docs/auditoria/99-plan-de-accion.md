# 99 · Plan de acción

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · Redactado como Project Manager + Product Owner + Arquitecto a partir de `01`–`10` y `90-sintesis.md`. Priorización: **MoSCoW + esfuerzo** (un equipo de una persona sin datos de alcance ni de tráfico para RICE). Esfuerzos en **horas o días de Alejandro**, no de generación de código (PM-007).

## 1. Resumen ejecutivo

**Qué es.** aguemar Studio es el sistema con el que Alejandro capta clientes (landing), opera y cobra (panel) y da a cada empresa cliente un espacio propio para ver y aceptar documentos (workspace). En diez días pasó de cero a producción con datos reales.

**Estado general.** El código está en buen estado: no hay fallos críticos, la seguridad de datos está bien resuelta y verificada, el diseño es coherente y accesible en lo esencial, y el ciclo comercial funciona de punta a punta. El problema no es lo construido sino **lo que lo rodea**: no se ha ensayado nunca una recuperación de la base, nadie se entera si algo falla en producción, un cambio roto puede publicarse sin que lo detenga nada, las cifras de cobro se calculan de tres formas distintas, y toda la operación depende de una sola persona sin manual. Son problemas de operación, baratos de arreglar, y hay que arreglarlos **antes** de añadir funciones nuevas.

**Nota de salud por área (1–10).**

| Área | Nota | Por qué |
|---|---|---|
| Seguridad | **8** | RLS y funciones con evidencia; 0 críticos y 0 altos; queda defensa en profundidad (CSP, registro abierto del proveedor) |
| Arquitectura | **7** | Capas limpias, sin ciclos, una proyección compartida; consistencia SQL↔TS sin contrato y migraciones sin reversa |
| Calidad de código | **7** | Tipos, lint y tests limpios; errores tragados en acciones y casts sin validar |
| UX / UI | **7** | Sistema de diseño coherente y estados cubiertos; bordes (`[PENDIENTE]`, 404, confirmaciones nativas) |
| Accesibilidad | **7** | Base sólida verificada por cálculo; el formulario de contacto no cumple contraste; sin pruebas en pantalla |
| Producto | **6** | Ciclo completo y bien pensado; sin marcha atrás, sin comprobantes, workspace sin conversación |
| SEO | **6** | Técnica correcta; una sola página sin ciudad ni intención; `/en` sin imagen |
| Performance | **6** | Servidor bien optimizado; el navegador carga 77 kB más que hace cuatro días; sin métricas de campo |
| QA | **5** | 154 tests de lógica pura; lo que decide dinero (SQL) y los flujos de negocio no se prueban en CI |
| DevOps | **5** | CI, staging y Dependabot existen; sin alertas, sin restauración probada, sin protección de rama |
| Gestión | **4** | Una persona, sin runbook, sin tablero, sin definición de hecho; velocidad por encima de la revisión |
| **Global** | **6** | Sólido en código, frágil en operación |

**Recomendación principal.** Dedicar las próximas dos semanas a "operar tranquilo" (recuperación probada, alertas, rama protegida, runbook mínimo) y el mes siguiente a hacer fiables las cifras y documentos de cobro. Posponer comprobantes y portafolio hasta entonces. Con ~10 horas semanales, el plan completo de altos y medios cabe en un trimestre; los críticos de operación, en diez días.

## 2. Quick wins (alto impacto, esfuerzo S)

| # | Acción | IDs | Tiempo estimado |
|---|---|---|---|
| 1 | Proteger `main` en GitHub exigiendo `verificar` y `seguridad`; bloquear force-push; `delete_branch_on_merge` | DEV-001, PM-003 | 15 min |
| 2 | Crear la organización de Sentry, cargar `NEXT_PUBLIC_SENTRY_DSN` en Vercel (solo Production), redeploy, forzar un error y ver la alerta | DEV-003, PM-004 | 45 min |
| 3 | Monitor de uptime gratuito sobre `/`, `/login` y un `/d/<token>` de prueba, con aviso a correo/WhatsApp | DEV-003, PM-004 | 30 min |
| 4 | Simulacro de restauración en una rama desechable de InsForge; cronometrar y escribir los pasos en el README (quitar el `[PENDIENTE]`) | DEV-002, PM-002 | 2–3 h |
| 5 | Copia cifrada de `_respaldos/` fuera del equipo (7-Zip con contraseña o `age`) y recordatorio semanal; borrar los volcados heredados y `.env.local.bak-produccion` | DEV-002, DEV-005, SEC-008 | 30 min |
| 6 | En la consola de Auth de InsForge (producción y staging): verificación de correo obligatoria, OAuth github/google desactivados, mínimo 8 caracteres | SEC-002 | 20 min + confirmar con el proveedor |
| 7 | Contraste del formulario de contacto: borde `white/40`, placeholder y ayuda `white/55` | A11Y-001 | 15 min |
| 8 | Título y descripción de la landing con intención y ciudad; `addressLocality` en JSON-LD; `og:image` explícito en `/en` | SEO-002 (etapa 1), SEO-003, SEO-001 | 2 h |
| 9 | `[PENDIENTE]` fuera de PDF, `/privacidad` y servicios; rechazarlo en `marca.ts`; aviso en el panel si Mi marca está incompleta | UX-001, COD-008 | 2 h |
| 10 | `captureException` en los `catch` del cron y del PDF; mensaje genérico con referencia en `errores.ts:84` y en login | DEV-003, COD-002, SEC-004, UX-009 | 1 h |
| 11 | `exigirPropietario()` en las acciones solo-propietario (clientes, servicios, leads, marca, cotizaciones, cobros, equipo); `ws_modulo_activo` en `ws_trabajos`, `ws_trabajo`, `ws_comentarios` | SEC-005, ARQ-006 | 2 h + migración |
| 12 | `bundleSizeOptimizations` en `withSentryConfig`; `configurarZod` fuera del chunk común; `Toaster` solo en layouts con sesión | PER-001 | 2 h |
| 13 | Añadir `solicitudes` al perfil de acceso Soporte | PRO-005 (parte S) | 15 min |
| 14 | Checklist de migración a producción en el README (respaldo → migrar → `db:funciones` sin diff → deploy → smoke test) | DEV-006, PM-003 | 30 min |
| 15 | Toasts con `closeButton` y errores persistentes; `aria-required` en `Campo`; cerrar diálogos a 32 px | A11Y-004, A11Y-002, A11Y-003 | 1 h |

Total: ≈ 2,5 días de Alejandro. Cubre tres de los cinco riesgos principales (R1 en parte, R3, R4 en parte).

## 3. Roadmap por fases

### Fase inmediata · semanas 1–2 · "Operar tranquilo"

- **Objetivo:** que un fallo se vea, que un cambio roto no se publique, que la base se pueda recuperar y que alguien más sepa qué hacer.
- **Incluye:** los 15 quick wins (§2) + PM-001 (runbook mínimo de cinco escenarios), DEV-004 parte S (`equipo.spec.ts` al job `seguridad`; `actions/cache` de `.next/cache`), SEC-004 (respuesta única en login), SEO-005 (`robots.txt`), A11Y-005 (`role="table"` en el calendario), A11Y-006 (`scroll-padding`), UX-002 (`not-found.tsx` por segmento), UX-004 (filtros desde las alertas del inicio), UX-006 (ligadura "fi" en Sora), PM-008 parte S (GitHub Issues con los hallazgos de esta auditoría, etiquetas y milestones).
- **Dependencias:** respuestas a las preguntas 6, 7 y 8 del plan (plan de InsForge/Vercel, protección actual, último respaldo). Nada bloquea empezar.
- **Esfuerzo total:** ≈ 5 días de Alejandro.
- **Terminado cuando:** `main` rechaza un push con CI en rojo; un error forzado en acción, cron y PDF aparece en Sentry; el uptime avisa al apagar un `/d/<token>`; el README tiene fecha y pasos del simulacro; existe `docs/RUNBOOK.md` leído por una segunda persona; la landing pasa contraste en el formulario; ningún `[PENDIENTE]` sale en PDF ni en `/privacidad`.

### Corto plazo · mes 1 · "Cifras y documentos fiables"

- **Objetivo:** que panel, workspace, PDF y cron digan el mismo pendiente, que la empresa acepte exactamente lo que vio, y que esa lógica tenga pruebas antes de tocarla.
- **Orden recomendado:** primero QA-001 (suite `db` contra staging: aceptación doble, numeración concurrente, FIFO, recordatorios duplicados, invitación usada/vencida, módulo inactivo), **después** ARQ-001 (una sola fuente de pendiente), PRO-001 (congelar al enviar, reenviar = versión), PRO-002 (`anulada` y cobros con `anulado_en`), PRO-007 (correo de copia con PDF congelado y rótulo), QA-008 (decisión sobre cobro mayor que el pendiente).
- **También:** COD-001 (envoltorio `accion()` con Sentry en 164 sitios), QA-002 (job e2e con `next start` contra staging en PR y nocturno), QA-003 (fixtures con teardown, `workers: 1` con sesión), QA-006 (`retries: 1`, artefactos), ARQ-008 + PM-006 + SEC-009 (PR aislado de Next 16, `proxy.ts`, audit en verde, `continue-on-error` fuera), SEC-003 (`crear_lead` solo desde el servidor con clave de servicio; derivar al respaldo al tocar el tope), UX-005 parte ("Tengo dudas" en la cotización), PM-007 (definición de hecho en `CLAUDE.md`), PM-005 parte técnica.
- **Dependencias:** QA-001 antes de ARQ-001/PRO-001/PRO-002; DEV-001 antes de QA-002; respuestas 1, 4 y 11 del plan (aceptaciones reales, nivel de prueba aceptable, autorización para correr e2e contra staging).
- **Esfuerzo total:** ≈ 12 días de Alejandro.
- **Terminado cuando:** la suite `db` corre en CI y pasa; `saldo()` desaparece de vistas y páginas; un cobro suelto da el mismo pendiente en los cuatro sitios; una cotización editada tras enviarse muestra "v2" y reenvía el aviso; la empresa recibe correo con el PDF congelado al aceptar; Next 16 en `main` con `npm audit --omit=dev` limpio; 164 `catch` pasan por el envoltorio y un error inesperado llega a Sentry con el nombre de la acción.

### Medio plazo · meses 2–3 · "Estructura y primeras funciones"

- **Objetivo:** cerrar la frontera SQL↔TS, la defensa en profundidad y la fase 15, y entregar la primera pieza de la fase 16 que pide la empresa (comprobantes adjuntos).
- **Incluye:** ARQ-003 + COD-003 (Zod en portal, cotización e inicio; `rpc<T>` que valide), ARQ-002 (fixture compartido de totales TS/SQL), ARQ-004 (generador de políticas por tabla, `db/esquema.sql`, limpieza heredada fuera de `migrations/`), SEC-001 (CSP con nonces solo en rutas con sesión; HSTS explícito tras `curl -I`), SEC-006 y SEC-007 (trigger en `comentarios`, `security_invoker`), QA-004 parte (coverage como medida, tests de los 8 validators, `conSesion()` inyectable), QA-005 (PDF largos y texto extraído), COD-004/005/006/007 (hotspots, `useGuardarYSalir`, reglas type-aware y Prettier, código muerto y `knip` en CI), PRO-003 (comprobante PDF adjunto al cobro en Storage privado + constancia "Pago recibido"), PRO-008 ("Mi cuenta", responsable visible, "empresas sin entrar en 30 días"), PRO-005 parte M (tipo incidencia, `resuelta`, mantenimiento recurrente), UX-003 (`useConfirmar`), UX-007 (tablero y cotización en 360 px), UX-010/011, PER-002/003, DEV-007 (plan de Vercel, `maxDuration` en PDF), PM-005 (consulta legal de una hora: ANPD, transferencia, Libro de Reclamaciones), SEO-002 etapa 2 (páginas `/servicios/*` con FAQ y CTA), A11Y-007 + SEO-004 (layout raíz por idioma), A11Y-008/009, SEO-006/007, fase 15 restante (Vercel Analytics y Speed Insights activados).
- **Dependencias:** QA-001 y QA-002 en CI (red para refactorizar); respuesta 3 (régimen de comprobantes) y 15 (asesoría legal); decisión de plan Vercel/InsForge (pregunta 6).
- **Esfuerzo total:** ≈ 18 días de Alejandro.
- **Terminado cuando:** lecturas de portal, cotización e inicio validadas con Zod y reportando a Sentry si fallan; CSP en modo bloqueo en `/panel` y `/w` sin reportes inesperados durante dos semanas; una tabla nueva se crea con el generador y pasa el test de políticas; la empresa descarga su comprobante desde el workspace y el portal; existen tres páginas de servicio indexadas; `/en` con `<html lang="en">`.

### Largo plazo · a partir del mes 4 · "Evolución"

- **Producto:** PRO-004 (tareas asignadas y "mis tareas" cuando haya colaborador real), PRO-006 (portafolio con autorización escrita), PRO-010 (`panel_metricas`: tasa de aceptación, días de cobro, lead→cotización), PRO-009 ("convertir y cotizar"), PRO-011 (PEN solo o totales por moneda; ficha fuera de Windows), OTP de aceptación si lo pide la asesoría o el ticket medio.
- **Arquitectura y plataforma:** ARQ-005 (encapsular `auth.users` y el SDK en una carpeta; plan de salida verificable), ARQ-007 (test de paridad `@modal`), ARQ-009 (paginación), ARQ-010; plan de pago de InsForge con respaldos programados y Vercel Pro cuando haya más de tres empresas con cobros (**supuesto** de umbral); QA-007 (axe en CI, contraste como test); generación de tipos si la CLI lo permite.
- **Operación:** segundo operador con acceso de lectura; política de soporte publicada en el workspace; revisión trimestral de respaldos (simulacro) y de dependencias mayores.
- **Esfuerzo:** ≈ 10–15 días, sin fecha comprometida.

Suma del plan (inmediata + corto + medio): ≈ 35 días de Alejandro. A 10 h/semana son **14–16 semanas**; a jornada completa, 7 semanas.

## 4. Backlog priorizado (MoSCoW + esfuerzo)

Impacto: N (negocio: dinero, clientes, legal), U (usuario), T (técnico). Fase: I (inmediata), C (corto), M (medio), L (largo).

| ID | Título corto | Perfil | Sev. | Esf. | Impacto | MoSCoW | Fase |
|---|---|---|---|---|---|---|---|
| DEV-002 | Restauración nunca ensayada, sin copia externa | DevOps | Alta | M | N | Must | I |
| PM-002 | Recuperación ante desastre no probada | PM | Alta | S/M | N | Must | I |
| DEV-001 | Vercel publica sin esperar CI; `main` sin protección | DevOps | Alta | S | T | Must | I |
| PM-004 | Producción a ciegas (DSN, uptime, cron) | PM | Alta | S | N | Must | I |
| DEV-003 | Observabilidad a medias | DevOps | Media | S | N | Must | I |
| PM-001 | Bus factor 1 sin runbook | PM | Alta | M | N | Must | I |
| A11Y-001 | Formulario de contacto sin contraste | A11Y | Alta | S | N/U | Must | I |
| SEC-002 | Registro abierto sin verificación; OAuth sin uso | SEC | Media | S+S | N | Must | I |
| UX-001 | `[PENDIENTE]` llega al cliente | UX | Media | S | N/U | Must | I |
| COD-008 | Validador acepta `[PENDIENTE` | COD | Baja | S | N | Must | I |
| SEC-005 | Falsos éxitos para el colaborador | SEC | Baja | S | T | Should | I |
| ARQ-006 | 3 `ws_*` sin comprobar módulo | ARQ | Baja | S | T | Should | I |
| SEC-004 | Auth sin límites y con mensajes que distinguen | SEC | Media | S | N | Should | I |
| COD-002 | Mensajes crudos de Postgres | COD | Baja | S | U | Should | I |
| UX-009 | Errores crudos en la interfaz | UX | Baja | S | U | Should | I |
| PER-001 | Sentry y Zod en el chunk común; landing 242 kB | PER | Media | S | U | Should | I |
| SEO-002 | Una sola página, sin ciudad ni intención (etapa 1) | SEO | Alta | S | N | Must | I |
| SEO-001 | `/en` sin `og:image` | SEO | Media | S | N | Should | I |
| SEO-003 | JSON-LD incompleto y con datos no publicados | SEO | Media | S | N | Should | I |
| DEV-005 | `.bak` de producción y secreto del cron manual | DevOps | Media | S | T | Should | I |
| SEC-008 | Secretos en disco fuera del gestor | SEC | Baja | S | T | Should | I |
| DEV-006 | Migraciones a mano sin checklist | DevOps | Media | S | T | Should | I |
| PM-003 | Sin protección, tags ni changelog | PM | Media | S | T | Should | I |
| PRO-005 | Soporte sin flujo propio (parte S: perfil) | PRO | Media | S | U | Should | I |
| A11Y-004 | Errores solo en toast de 4 s | A11Y | Media | S | U | Should | I |
| A11Y-002 | Obligatorios no anunciados | A11Y | Media | S | U | Should | I |
| A11Y-003 | Objetivos de 16–18 px | A11Y | Media | S | U | Should | I |
| A11Y-005 | `role="grid"` sin teclado | A11Y | Media | S | U | Should | I |
| A11Y-006 | Barras sticky sin `scroll-padding` | A11Y | Media | S | U | Should | I |
| UX-002 | 404 que expulsa del marco | UX | Media | S | U | Should | I |
| UX-004 | Alertas del inicio sin filtro | UX | Media | S | U | Should | I |
| UX-006 | Ligadura "fi" en PDF | UX | Media | S | U | Should | I |
| SEO-005 | `/d/` y `/login` bloqueados en robots | SEO | Baja | S | T | Could | I |
| PM-008 | Sin tablero (parte S) | PM | Media | S | T | Should | I |
| QA-001 | SQL crítico sin casos límite ni concurrencia | QA | Alta | M | N | Must | C |
| ARQ-001 | Tres fórmulas de pendiente | ARQ | Alta | M | N | Must | C |
| PRO-001 | Cotización enviada editable sin versión | PRO | Alta | M | N | Must | C |
| PRO-002 | Sin anular aceptada ni cobro con rastro | PRO | Alta | M | N | Must | C |
| PRO-007 | Aceptación sin copia ni rótulo | PRO | Media | S/M | N | Should | C |
| QA-008 | Cobro mayor que el pendiente | QA | Baja | S | N | Should | C |
| COD-001 | Acciones tragan excepciones | COD | Media | M | T/N | Must | C |
| QA-002 | Flujos de navegador fuera de CI | QA | Alta | M | T | Must | C |
| QA-003 | Datos de prueba compartidos | QA | Media | M | T | Should | C |
| QA-006 | Playwright que esconde flakiness | QA | Media | S | T | Should | C |
| ARQ-008 | Next 15 → 16 | ARQ | Media | M | T | Should | C |
| PM-006 | Deuda de dependencias | PM | Media | M | T | Should | C |
| SEC-009 | `postcss`/`braces`; audit informativo | SEC | Baja | M | T | Should | C |
| SEC-003 | Tope de `crear_lead` bloquea el formulario | SEC | Media | M | N | Should | C |
| DEV-004 | CI sin e2e ni caché | DevOps | Media | M | T | Should | C |
| UX-005 | Bandeja no en línea; sin objetar cotización | UX | Media | M | U | Should | C |
| PM-007 | Velocidad > revisión; sin DoD | PM | Media | S/L | T | Should | C |
| PM-005 | Ley 29733, Libro, Vercel Hobby | PM | Media | S | N | Should | C/M |
| ARQ-003 | Contrato SQL→TS sin verificación | ARQ | Media | M | T | Should | M |
| COD-003 | Casts sin validar | COD | Media | M/L | T | Should | M |
| ARQ-002 | Espejos TS sin paridad | ARQ | Media | S | T | Should | M |
| ARQ-004 | Migraciones sin reversa; generadores de un uso | ARQ | Media | M | T | Should | M |
| SEC-001 | Token legible por JS; CSP solo reporte | SEC | Media | M | T | Should | M |
| SEC-006 | Comentarios de la empresa editables | SEC | Baja | S | T | Could | M |
| SEC-007 | Vistas sin `security_invoker` | SEC | Baja | S | T | Could | M |
| QA-004 | Cobertura no medida; capas sin tests | QA | Media | L | T | Could | M |
| QA-005 | Tests de PDF de humo | QA | Media | S | U | Should | M |
| COD-004 | Hotspots que crecen | COD | Baja | M | T | Could | M |
| COD-005 | Cierre tras guardar copiado 8 veces | COD | Baja | S | T | Could | M |
| COD-006 | Sin reglas type-aware ni formato | COD | Baja | S/M | T | Could | M |
| COD-007 | Código muerto y falsos positivos | COD | Baja | S | T | Could | M |
| PRO-003 | Cobro sin comprobante | PRO | Alta | M | N | Must | M |
| PRO-008 | Workspace sin "Mi cuenta" ni objeción | PRO | Media | M | U | Should | M |
| PRO-005 | Soporte sin flujo propio (parte M) | PRO | Media | M | U | Could | M |
| UX-003 | `window.confirm` mezclado | UX | Media | S | U | Should | M |
| UX-007 | Kanban y cotización en 360 px | UX | Baja | M | U | Could | M |
| UX-008 | "cliente" vs "empresa"; callejones | UX | Baja | S | U | Could | M |
| UX-010 | `danger` sin token oscuro; tema del portal | UX | Baja | S | U | Could | M |
| UX-011 | Sin `loading.tsx` en portal e invitación | UX | Baja | S | U | Could | M |
| PER-002 | Idas y vuelta en serie; RPC duplicada | PER | Baja | S | U | Could | M |
| PER-003 | `panel_resumen` escala por filas | PER | Baja | M | T | Could | M |
| DEV-007 | Hobby comercial; `maxDuration` | DevOps | Baja | S | N | Should | M |
| SEO-002 | Páginas por servicio (etapa 2) | SEO | Alta | L | N | Should | M |
| SEO-004 | `lang` fijo en `/en` | SEO | Baja | M | U | Could | M |
| A11Y-007 | `/en` con `lang="es-PE"` | A11Y | Baja | M | U | Could | M |
| A11Y-008 | Textos bajo 4,5:1 | A11Y | Baja | S | U | Could | M |
| A11Y-009 | Skip link en portal; `scope`; reduced-motion | A11Y | Baja | S | U | Could | M |
| SEO-006 | `lastmod`, canónica, `hreflang` del selector | SEO | Baja | S | T | Could | M |
| SEO-007 | LCP con hero desde `opacity: 0` | SEO | Baja | S | U | Could | M |
| PRO-004 | Colaborador sin planificar ni asignación | PRO | Media | M | U | Could | L |
| PRO-006 | Landing vende dos oficios; catálogo solo soporte | PRO | Media | S/M | N | Should | L (catálogo: I) |
| PRO-009 | Lead → cotización en tres pantallas | PRO | Baja | S | U | Could | L |
| PRO-010 | Se mide captación, no conversión | PRO | Baja | S/M | N | Could | L |
| PRO-011 | Multi-moneda a medias; ficha solo Windows | PRO | Baja | S | U | Could | L |
| ARQ-005 | Costo de salida de InsForge | ARQ | Media | S/L | T | Could | L |
| ARQ-007 | 44 archivos espejo `@modal` | ARQ | Baja | S | T | Could | L |
| ARQ-009 | Tope silencioso de 200 | ARQ | Baja | S | U | Could | L |
| ARQ-010 | Código muerto y lógica en páginas | ARQ | Baja | S | T | Could | L |
| QA-007 | Sin axe ni e2e de errores | QA | Baja | S | U | Could | L |

Won't (por ahora, con motivo): emisión electrónica de comprobantes (pregunta 3 sin responder), firma electrónica u OTP en la aceptación (hasta asesoría legal), multi-usuario por empresa, migrar de InsForge (ADR-02 sin disparador), cobertura con umbral global.

## 5. Riesgos del plan y mitigación

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **Horas reales menores que las supuestas** (10 h/semana sin confirmar; la cadencia observada fue jornada completa y puede no repetirse) | Alta | Las fases están ordenadas por valor: si solo se hace la inmediata, se cierran R1, R3 y R4 en gran parte. Revisar el plan al cerrar cada fase |
| **Refactorizar la lógica de cobro (ARQ-001, PRO-001/002) sin red** | Media | QA-001 es prerrequisito explícito; no tocar `deudas_cotizacion` ni la aceptación hasta que la suite `db` pase en CI |
| **Next 16 rompe algo no previsto** (middleware → proxy, Sentry 11, Turbopack, `@react-pdf`) | Media | PR aislado con build en `.next-verify`, tests PDF y e2e contra staging antes de mergear; mantener Next 15 hasta que todo pase |
| **InsForge no ofrece lo que se asume** (verificación de correo que revoca sesiones, límites de intentos, restauración sobre rama, generación de tipos) | Media | Tres preguntas al proveedor en la semana 1 (SEC-002, SEC-004, DEV-002); si no hay respuesta, aplicar las alternativas ya descritas (cuentas creadas antes de la invitación rechazadas; rate limit por plan; export + import probado) |
| **Respuestas pendientes del plan** (preguntas 1–15) cambian prioridades | Alta | El plan asume lo más conservador; las preguntas están en §6 ordenadas por lo que desbloquean |
| **Tentación de la fase 16 antes de tiempo** (PM-R10) | Alta | Comprobantes adjuntos están en el plan (medio plazo) con condición de entrada: QA-001, ARQ-001 y PRO-002 cerrados. Portafolio solo con autorización escrita |
| **Evidencia "no verificada en pantalla"** (A11Y, UX, SEO-007, PER) puede estar sobre o subestimada | Media | Una sesión de 2 h con el dev server activo: axe en 6 rutas, recorrido con teclado, 360 px, modo oscuro, Lighthouse; ajustar severidades |
| **Trabajo legal fuera del control técnico** (PM-005) | Media | Una consulta de una hora con tres preguntas concretas; mientras tanto, `/privacidad` sin `[PENDIENTE]` y aceptación con copia al cliente |
| **Dependencia de la IA para ejecutar el plan** (PM-007) | Alta | Definición de hecho con prueba independiente por cambio; estimar en horas propias; revisar diffs de dinero y SQL línea a línea |

## 6. Preguntas abiertas que el equipo debe resolver

Ordenadas por lo que desbloquean. Las 15 del plan quedaron sin responder (`00-plan.md` §5); se consolidan aquí con las nuevas de los informes.

**Desbloquean la fase inmediata**
1. ¿Último `npm run db:respaldo`, dónde está la copia fuera del equipo y se intentó alguna restauración? (DEV-002)
2. ¿`main` está protegida y Vercel exige el check? ¿Los secretos `STAGING_*`/`E2E_*` corren los 16 tests o los saltan? Abrir el run `39510801670` y mirar "passed" vs "skipped". (DEV-001, QA TST-01)
3. ¿Plan de Vercel (Hobby/Pro), de InsForge y de Sentry? ¿Región de las funciones (`iad1`)? (DEV-007, PER-002)
4. ¿La configuración de Auth de producción coincide con staging (registro abierto, sin verificación, OAuth activos, mínimo 6)? (SEC-002)
5. A InsForge: ¿`resetPassword` revoca sesiones? ¿Límites de intentos en login y canje de código? ¿Restauración de `backups` sobre una rama? ¿Generación de tipos? (SEC-002, SEC-004, DEV-002, ARQ-003)
6. ¿Mi marca en producción tiene RUC, responsable, teléfono, correo del dominio y dirección? (UX-001, SEO-003)

**Desbloquean el corto plazo**
7. ¿Cuántas empresas, colaboradores, cotizaciones aceptadas, cobros sueltos y cotizaciones en USD hay en producción? (ARQ-001, PRO-002, PRO-011)
8. ¿Una cotización `enviada` debe bloquearse hasta respuesta o versionarse? (PRO-001)
9. ¿Un cobro mayor que el pendiente se reparte (FIFO) o se rechaza con aviso? (QA-008)
10. ¿Autorizas correr los e2e de navegador y la suite `db` contra staging en CI (cuentas `.test`)? (QA-002)
11. ¿Horas por semana reales en los próximos tres meses y fecha comprometida con alguna empresa? (PM-008)

**Desbloquean el medio plazo**
12. Comprobantes: ¿factura electrónica SUNAT, recibo por honorarios o solo adjuntar PDF? ¿Régimen tributario? (PRO-003)
13. ¿Nombre + DNI basta como aceptación para los montos actuales, o se quiere OTP/firma? ¿Hay asesoría legal para Ley 29733 (ANPD, transferencia, Libro de Reclamaciones)? (PRO-007, PM-005)
14. ¿Habrá un segundo operador o desarrollador? ¿Quién más tiene acceso a Vercel, InsForge, Resend, Namecheap y GitHub, y dónde están las credenciales de recuperación? (PM-001)
15. ¿Qué canal y plazo de soporte se promete a las empresas? ¿Qué servicio factura más (soporte por equipo, mantenimiento mensual, desarrollo)? (PRO-005)
16. ¿Hay clientes angloparlantes que justifiquen `/en`? ¿Algún cliente autorizaría aparecer en el portafolio? (SEO-001/004, PRO-006)
17. ¿Search Console y Google Business Profile están creados y con qué ciudad? (SEO-002)
