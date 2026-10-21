# 04 · Gestión del proyecto

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · Perfil: Project Manager (comité externo, solo lectura). `gh` no está instalado en el equipo; lo de GitHub se consultó por la API pública sin autenticación (`curl https://api.github.com/repos/aguemar-work/aguemar/...`). Hecho = verificado; inferencia, opinión y **supuesto** se marcan.

## Diagnóstico general

Un sistema funcionalmente completo (fases 1–14.5) construido por **una persona con Claude Code en 8 días de trabajo** (47 commits propios, ~60 300 líneas añadidas, 14 commits "Fase/Sprint" de 1 000–4 200 líneas) y en producción con datos reales desde el 20/10. La disciplina técnica es alta para su edad (CI verde, staging, migraciones probadas, tres autoevaluaciones escritas), pero **toda la operación descansa en Alejandro y en `CLAUDE.md`**: no hay runbook, ni respaldo restaurable probado, ni alertas en producción, ni rama protegida, ni tablero de pendientes. La velocidad observada (~8 000 líneas/día) supera lo que una persona puede revisar, de modo que la calidad real depende de pruebas que hoy no cubren el SQL crítico (QA-001/002). El riesgo dominante no es técnico sino de **continuidad**: pérdida de datos, caída silenciosa y ausencia del único operador.

## Fortalezas (con evidencia)

- **Trazabilidad y memoria escrita**: `CLAUDE.md` (29,9 KB) describe fases, convenciones, despliegue y reglas de seguridad; `README.md` (17,7 KB) tiene instalación, entornos, respaldos, Resend, cron, Sentry; `AUDITORIA.md` (16/10), `PLAN-AUDITORIA.md` y `ARQUITECTURA.md` (ADR-01..10, R-01..R-11) registran decisiones con fecha y commit.
- **CI real y verde**: `.github/workflows/ci.yml` (tipos, lint, unit, build) en cada PR y push; último run en `main` (`f47ac68`) `success` (API pública `actions/runs`); el job `seguridad` corre contra staging con secretos cargados (09-qa, run `39510801670`), lo que cierra la pregunta 7 del plan.
- **Dos entornos y reglas de migración**: rama `staging` de InsForge (`README.md:43-83`), migraciones solo tras pasar por staging (`CLAUDE.md` Despliegue), respaldo previo a cada migración (`CLAUDE.md` Respaldos), `db/funciones/` con test de inventario (`tests/unit/migraciones.node.test.ts`).
- **Dependabot activo y atendido**: `.github/dependabot.yml` (semanal, agrupado); 7 de 10 PR cerrados el mismo 20/10 (#1, #2, #7, #10 mergeados; #3, #8, #9 reemplazados).
- **Commits con mensajes de valor** ("Fase 13: modelo de propietario y cierre de la base"), un solo autor identificable, historial sin secretos (evidencia común).
- **Autoevaluación honesta**: `ARQUITECTURA.md` §6 distingue hecho / parcial / pendiente y registra desvíos con motivo; `[PENDIENTE: …]` en lugar de datos inventados (`README.md:99`).

## Estado y cronología

| Fecha | Commits | +/− líneas | Hito | Observación |
|---|---|---|---|---|
| 10/10 | 2 | +13 076 | Fase 1 (base, Supabase) | Arranque |
| 13/10 | 8 | +7 796 / −912 | Migración a InsForge, Fases 2–3 | Cambio de proveedor en el día 2 |
| 14/10 | 4 | +7 442 / −880 | Fases 4–6 | Workspaces y cotizaciones en un día |
| 15/10 | 7 | +12 971 / −604 | Fases 7a, 7b, 8, 9, 10, 11 | **Seis fases en un día**; `AUDITORIA.md` sobre `c81d9b4` |
| 16/10 | 5 | +8 135 / −854 | Fases 12, 13, 14 + landing 3D | Tres fases "cerradas" en un día (11:08, 11:33, 16:29) |
| 17/10 | 7 | +1 639 / −3 131 | Pulido, PDF sobrios, landing sin 3D | Primer día de reducción neta |
| 19/10 | 5 | +1 236 / −931 | Landing como marca personal, `/en`, privacidad | |
| 20/10 | 9 (+4 bot, 5 merges) | +8 012 / −540 | Sprint 1, Fase 14.5, Sprint 2, **producción** | Migraciones aplicadas en producción el mismo día que se escribieron |

Hechos de proceso (API pública y repo): **0 tags, 0 releases** (`releases` → `[]`), `package.json` `"version": "0.1.0"` fijo; **`main` no protegida** (`branches/main` → `"protected": false`); **0 issues** (los 10 "issues" son los PR de Dependabot); **10 PR, todos de Dependabot**, 3 abiertos (#4 eslint 10.13, #5 next 16.4.2, #6 eslint-config-next 16.4.2); 10 ramas remotas `dependabot/*`, 7 residuales de PR ya cerrados (sin borrado automático). El trabajo propio entra directo a `main` sin PR ni revisión (el merge `1fdef95` de `claude/confident-faraday-361a24` es la única rama de trabajo). No hay `CHANGELOG`, `CODEOWNERS` ni plantilla de PR (`ls -R .github` → `ci.yml`, `dependabot.yml`). `docs/` solo contiene esta auditoría: **no hay guía para la empresa ni para un segundo desarrollador**. Horario de commits 08:22–18:30 en días completos: la cadencia observada es de jornada completa, no de 10 h/semana (**supuesto** de la pregunta 13).

## Matriz de riesgos

| ID | Riesgo | Prob. | Impacto | Mitigación actual | Evidencia |
|---|---|---|---|---|---|
| PM-R01 | Pérdida de datos de producción sin recuperación completa (un solo respaldo manual, export sin `auth.users`, sin simulacro, copia externa no verificada) | Media | Crítico | `npm run db:respaldo`, respaldo manual renovado 20/10 | `README.md:89-101`, `ARQUITECTURA.md:257` (R-01 🟡), `README.md:99` `[PENDIENTE: primer simulacro]` |
| PM-R02 | Alejandro ausente (enfermedad, viaje) una semana: nadie opera cobros, cron, incidentes, accesos | Media | Alto | Ninguna (sin runbook, sin segundo operador) | `git shortlog -sn` → 1 autor; `docs/` sin runbook; pregunta 14 |
| PM-R03 | Fallo silencioso en producción (PDF, portal, cron, correo) | Alta | Medio | `src/lib/sentry.ts` listo pero **sin DSN**; cron solo `console.error` | `README.md:35,172-180`, `ARQUITECTURA.md:264` (ADR-10 ⏳), `src/app/api/cron/recordatorios/route.ts:29-31` |
| PM-R04 | Dependencia de InsForge (empresa joven, plan gratuito, us-east, sin SLA conocido) | Media | Alto | Export propio, SDK acotado (ARQ-005: salida moderada, concentrada en auth) | `01-arquitectura.md` ARQ-005; **supuesto**: sin contrato ni SLA (pregunta 6) |
| PM-R05 | Continuidad de proveedores en planes gratuitos: Vercel Hobby con uso comercial (términos), Resend, Sentry Developer | Media | Alto | Ninguna formal | `README.md:184` ("plan Hobby"), `00-plan.md` Q6; **opinión**: los términos de Hobby excluyen uso comercial |
| PM-R06 | Cumplimiento Ley 29733: banco de datos no inscrito en la ANPD, consentimiento de transferencia internacional, Libro de Reclamaciones, `[PENDIENTE]` visibles | Media | Medio–Alto | `/privacidad` escrita, DNI enmascarado, Sentry sin PII | `src/app/privacidad/page.tsx:34-37,126-131`; `AUDITORIA.md:521` (❓ Libro); pregunta 15 sin asesoría |
| PM-R07 | Seguridad de la aplicación | Baja | Alto | RLS + `security definer`, inventario en test | `07-seguridad.md`: severidad máxima Media (SEC-001..009) |
| PM-R08 | Regresión que llega a producción: push directo a `main` sin protección, e2e de navegador fuera de CI, SQL sin pruebas | Media | Alto | CI en push; `seguridad.spec.ts` en CI | `"protected": false`; `09-qa.md` QA-001 (Alta), QA-002 (Alta) |
| PM-R09 | Deuda de dependencias: Next 15→16 pendiente con 2 avisos de `postcss`, eslint 10, audit informativo | Alta | Medio | Dependabot; CI del PR #5 (`next-16.4.0`) ya **pasa** | `evidencia-global.md` §Dependencias; `ci.yml:37-39`; ARQ-008, SEC-009 |
| PM-R10 | Scope creep: fase 16 (comprobantes, portafolio) antes de cerrar 15 y los hallazgos de tres auditorías | Alta | Medio | `ARQUITECTURA.md` §5 ordena "operar tranquilo" primero | `CLAUDE.md` Fases 15–16; 0 issues abiertos para seguir hallazgos |
| PM-R11 | Costes: todo en planes gratuitos; el salto (InsForge Pro, Vercel Pro, Sentry) llega con el primer cliente que exija respaldo o con tráfico | Baja (3 meses) | Medio | — | **Supuesto** (pregunta 6); sin presupuesto documentado |
| PM-R12 | Migración aplicada a mano en orden incompatible con el código publicado (R-08) | Baja | Alto | Regla escrita; sin checklist | `ARQUITECTURA.md:202` "parcial"; `README.md:140` |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | PM-001 |
| Título | Bus factor 1 sin runbook de operación ni documentación para un segundo operador o para las empresas |
| Severidad | Alta |
| Evidencia | `git shortlog -sn --all` → Alejandro 52, dependabot 10; `ls -R docs` → solo `auditoria/`; `README.md` es guía de desarrollo (instalación, migraciones), no de operación; `CLAUDE.md` (29,9 KB) es la única descripción del sistema y está escrita para la IA; pregunta 14 del plan ("solo") sin responder |
| Impacto | Hecho: si Alejandro no está, nadie sabe qué hacer si cae InsForge, si el cron deja de mandar recordatorios, si una empresa reporta un cobro mal registrado o pierde el acceso. Negocio: la promesa del workspace ("tu espacio") no tiene a nadie detrás; un segundo desarrollador necesitaría leer 150 KB de Markdown y 25 migraciones (onboarding > 1 día, inferencia). Las empresas no tienen guía de su workspace ni canal de soporte declarado |
| Recomendación | `docs/RUNBOOK.md` de una página por escenario: (1) InsForge caído: qué ve el cliente, a quién escribir, cómo leer el estado; (2) cron sin correos: `cobro_recordatorios_fallidos`, reejecutar con `curl`; (3) cobro mal registrado: cómo corregir (los cobros no son inmutables) y cómo avisar; (4) empresa sin acceso: reenviar invitación / quitar acceso; (5) restaurar desde respaldo. Más `docs/GUIA-WORKSPACE.md` (o página `/w/[slug]/ayuda`) de 1 hoja para la empresa, y un "contacto de respaldo" (persona de confianza con acceso de lectura a Vercel e InsForge). Onboarding: `docs/ONBOARDING.md` con el orden de lectura y un día objetivo |
| Esfuerzo | M |
| Dependencias | PM-002, PM-004 |

| Campo | Contenido |
|---|---|
| ID | PM-002 |
| Título | Recuperación ante desastre no probada: un solo respaldo manual en plan gratuito, export sin cuentas, sin copia externa verificada |
| Severidad | Alta |
| Evidencia | `README.md:89` ("un solo respaldo manual… lo que no se exporta, no está respaldado"); `README.md:97` (export sin `auth.users`); `README.md:99` `[PENDIENTE: primer simulacro]`; `ARQUITECTURA.md:257` R-01 🟡 "pendiente… copiar los exports fuera del equipo… primer simulacro"; `_respaldos/` solo en disco local (evidencia común); pregunta 8 abierta |
| Impacto | Hecho: un borrado accidental o una migración equivocada se recupera a mano con un export de hasta 10 000 filas por tabla sin cuentas; una pérdida total del proyecto InsForge depende de un respaldo del proveedor que nunca se restauró. Negocio: aceptaciones con huella (ADR-07) y cobros son la evidencia contractual del estudio; perderlos es perder la prueba de lo cobrado |
| Recomendación | En la próxima semana: (1) simulacro de restauración en una rama desechable y fijar los pasos en el README (quita el `[PENDIENTE]`); (2) copia cifrada fuera del equipo (p. ej. `age`/7-Zip con contraseña a un almacenamiento en la nube personal) con recordatorio semanal; (3) decidir con fecha el paso a un plan de InsForge con respaldos programados o PITR en cuanto haya >3 empresas con cobros (**supuesto** de umbral); (4) exportar también las cuentas (`insforge backups`) antes de cada migración de producción, ya en `CLAUDE.md` |
| Esfuerzo | S (simulacro + copia) / M (plan de pago y automatizar) |
| Dependencias | PM-001 (runbook de restauración) |

| Campo | Contenido |
|---|---|
| ID | PM-003 |
| Título | Entrega sin control de cambios: `main` desprotegida con despliegue automático, sin PR propios, sin tags, releases ni changelog |
| Severidad | Media |
| Evidencia | API pública `branches/main` → `"protected": false` (`/protection` → 401, requiere auth); `git tag` → vacío; `releases` → `[]`; `package.json:3` `0.1.0`; 10 PR todos de Dependabot; 47 commits propios directos a `main`; `README.md:139` pide proteger `main` (instrucción escrita el 16/10, no ejecutada); `ARQUITECTURA.md:202` R-08 "parcial" sin checklist |
| Impacto | Hecho: un push con CI en rojo se despliega igual (Vercel no espera al check si la rama no lo exige; inferencia sobre la configuración por defecto). No hay forma de decir "qué versión tiene producción" ni de volver a una anterior por nombre; una migración de producción no queda ligada a un commit. Negocio: ante un incidente, el diagnóstico empieza por `git log` |
| Recomendación | (1) Proteger `main` exigiendo `verificar` y `seguridad` (5 min); (2) etiquetar cada despliegue con migración (`v0.14.5`, `v0.15.0`) y anotar en `CHANGELOG.md` qué migración lleva y qué respaldo se tomó; (3) checklist de 3 pasos de migración en el README (R-08: respaldo → migración compatible → push) como lista marcable; (4) `delete_branch_on_merge` para limpiar las 7 ramas residuales. El trabajo propio puede seguir sin PR mientras sea una persona, pero con tag por despliegue |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | PM-004 |
| Título | Producción a ciegas: Sentry sin DSN, sin monitor de uptime, cron de cobros que falla solo en logs |
| Severidad | Alta |
| Evidencia | `README.md:35` (`NEXT_PUBLIC_SENTRY_DSN` "recomendada", no cargada: `ARQUITECTURA.md:264` ADR-10 ⏳ "necesita tus cuentas"); `src/app/api/cron/recordatorios/route.ts:29-31` captura la excepción y responde 500 con `console.error` (no llega a `onRequestError` ni a Sentry aunque hubiera DSN; inferencia); `route.ts:21` responde 503 en silencio si falta `CRON_SECRET`; `vercel.json` una ejecución diaria sin verificación de éxito; R-06 "Alta/Medio" abierto |
| Impacto | Hecho: un fallo del PDF, del portal `/d/[token]` o de los recordatorios de pago se entera por el cliente, no por el sistema; los recordatorios son el mecanismo de "cobro sin perseguir" (Sprint 1) y pueden dejar de salir sin que nadie lo note. Negocio: ingresos y reputación |
| Recomendación | Mismo día: crear la cuenta de Sentry y cargar el DSN en Vercel (README ya lo explica, 30 min); monitor gratuito de uptime sobre `/`, `/login` y un `/d/<token>` de prueba con aviso a WhatsApp/correo; en el cron, `Sentry.captureException` en el `catch` y un "latido" (p. ej. Sentry Cron Monitors o un check de "último run" en `ajustes_sistema` que el inicio del panel muestre en rojo si pasa de 36 h) |
| Esfuerzo | S |
| Dependencias | PM-001 (runbook usa estas alertas) |

| Campo | Contenido |
|---|---|
| ID | PM-005 |
| Título | Cumplimiento y términos de proveedores no resueltos: Ley 29733 sin asesoría, Libro de Reclamaciones, Vercel Hobby para una actividad comercial |
| Severidad | Media |
| Evidencia | `src/app/privacidad/page.tsx:34-37` (`[PENDIENTE: RUC/dirección/correo]` si Mi marca está vacía; UX-001, COD-008), `:126-131` (transferencia fuera del Perú por aceptación tácita), `:145` (menciona la ANPD pero no la inscripción del banco de datos); `AUDITORIA.md:521` Libro de Reclamaciones ❓; `README.md:184` "plan Hobby"; `00-plan.md` Q6 y Q15 abiertas |
| Impacto | **Opinión, no asesoría legal**: el estudio guarda nombre, DNI y RUC de terceros (aceptaciones, clientes) en servidores de EE. UU.; la Ley 29733 exige inscribir bancos de datos y regular la transferencia, y el Libro de Reclamaciones aplica a proveedores de servicios a consumidores. Los términos del plan Hobby de Vercel excluyen el uso comercial: un cambio de política o una revisión del proveedor puede suspender el sitio sin aviso (**supuesto**: no se verificó el plan en la consola) |
| Recomendación | (1) Consulta de 1 hora con asesoría legal peruana con tres preguntas concretas (inscripción ANPD, cláusula de transferencia, Libro de Reclamaciones virtual); (2) pasar Vercel a Pro o confirmar por escrito que el uso encaja en Hobby; (3) bloquear `[PENDIENTE]` en páginas públicas (COD-008) y añadir el enlace al Libro si aplica |
| Esfuerzo | S (técnico) / pregunta abierta (legal) |
| Dependencias | COD-008, UX-001 |

| Campo | Contenido |
|---|---|
| ID | PM-006 |
| Título | Deuda de dependencias que crece sola: Next 16 y eslint 10 abiertos, auditoría de CI informativa, ramas residuales |
| Severidad | Media |
| Evidencia | PR #5 (`next 15.5.27 → 16.4.2`) y #6 abiertos; run de CI en `dependabot/npm_and_yarn/next-16.4.0` → `success` (API pública), los de eslint/eslint-config-next → `failure`; `npm audit --omit=dev` → 1 alta + 1 moderada en `postcss` anidado cuyo fix es Next 16 (evidencia común); `ci.yml:37-39` `continue-on-error: true`; 7 ramas `dependabot/*` de PR ya cerrados |
| Impacto | Hecho: el aviso de seguridad se arrastra desde el 16/10 (SEG-10) y cada semana Dependabot abre más PR que se cierran sin merge; `continue-on-error` hace que un aviso nuevo de producción pase desapercibido. Inferencia: con Next 16 ya en verde en CI, el coste de hacerlo ahora es menor que dentro de tres meses |
| Recomendación | Reservar una sesión aparte para ARQ-008 (PR #5: `proxy.ts`, build en `.next-verify`, tests PDF y e2e contra staging), luego #4/#6 juntos; quitar `continue-on-error` cuando quede en verde; `delete_branch_on_merge`; regla en `CLAUDE.md`: un PR de Dependabot no vive más de dos semanas (se mergea o se cierra con motivo) |
| Esfuerzo | M |
| Dependencias | ARQ-008, SEC-009 |

| Campo | Contenido |
|---|---|
| ID | PM-007 |
| Título | Velocidad que supera la capacidad de revisión: estimaciones cumplidas "de sobra" y una definición de hecho que no incluye prueba independiente |
| Severidad | Media |
| Evidencia | `git log --shortstat`: 15/10 seis fases (+12 971 líneas), 16/10 tres fases (+8 135), 20/10 Sprint 1 + Fase 14.5 + Sprint 2 (+8 012) y despliegue a producción el mismo día; `PLAN-AUDITORIA.md:68,83` ("1–1,5 días", "2 días") hechas en horas; `ARQUITECTURA.md:224` ("~3 días") hecha el 20/10 entre 12:40 y 15:19; `CLAUDE.md` Rol: "revisa la UI en escritorio y móvil" como única verificación humana; `09-qa.md` QA-001/QA-002: SQL crítico sin pruebas, 49 flujos de navegador fuera de CI; `02-calidad.md` COD-001: 164 `catch` que ocultan errores |
| Impacto | Hecho: las estimaciones miden tiempo de generación, no de validación; nadie leyó 8 000 líneas al día. Inferencia: los defectos de integración (ARQ-001, tres fórmulas de saldo; SEC-005 falsos éxitos) son el síntoma esperado. Negocio: cada fase "✅" es una promesa a clientes reales que no tiene prueba automática detrás |
| Recomendación | Definición de hecho escrita en `CLAUDE.md` con cuatro condiciones verificables: tipos/lint/unit en CI, e2e del flujo tocado contra staging (en CI o con el log pegado en el commit), revisión en pantalla con captura, y para toda migración: respaldo + simulacro en staging + nota en `CHANGELOG`. Separar "construir" de "estabilizar" en el calendario (ver PM-008). Las estimaciones futuras en **horas de Alejandro**, no en días de IA |
| Esfuerzo | S (regla) / L (cumplirla: QA-001, QA-002) |
| Dependencias | QA-001, QA-002, COD-001, PM-003 |

| Campo | Contenido |
|---|---|
| ID | PM-008 |
| Título | Sin tablero ni priorización explícita: tres auditorías internas, cero issues, y la fase 16 compite con la estabilización |
| Severidad | Media |
| Evidencia | API pública `issues?state=all` → 10, todos PR; `AUDITORIA.md` (43 hallazgos), `ARQUITECTURA.md` (R-01..R-11) y esta auditoría (≈70 hallazgos en 01–10) sin un sitio donde marcar estado; `CLAUDE.md` Fases 15 ("Pendiente: DSN, Analytics, uptime; CSP con nonces") y 16 ("Comprobantes… portafolio") listadas como siguiente trabajo; sin política de soporte ni SLA a empresas en ningún documento (`rg -i "SLA|soporte" *.md` → solo "soporte técnico" como área) |
| Impacto | Inferencia: lo pendiente vive en la cabeza de Alejandro y en Markdown sin estado; la tendencia observada (ver cronología) es sumar funcionalidad. Negocio: con ~10 h/semana (**supuesto**, pregunta 13) y 20 h de atención a clientes, fase 16 (≈2 días según `PLAN-AUDITORIA.md:102`) consumiría el trimestre y dejaría PM-002/PM-004 abiertos |
| Recomendación | Hitos realistas a 3 meses con ~10 h/semana (≈16 días-persona): **M1 (semanas 1–2, 3 días): operar tranquilo** — PM-004, PM-002 simulacro + copia externa, PM-003 protección y tags, runbook mínimo (PM-001). **M2 (semanas 3–6, 5 días): estabilizar** — ARQ-001, Next 16 (PM-006), QA-001 (pruebas SQL de aceptación y saldo), COD-001, DoD (PM-007). **M3 (semanas 7–10, 5 días): cerrar fase 15 y legal** — CSP con nonces, Analytics, PM-005, guía del workspace. **M4 (semanas 11–13, 3 días): fase 16 solo comprobantes adjuntos** (ADR-08); portafolio cuando haya autorización de clientes (pregunta 5). Gestión: GitHub Issues con etiquetas `auditoria`, `fase-15`, `fase-16` y un milestone por hito; política de soporte de una frase en el workspace ("respondo comentarios en 2 días hábiles") |
| Esfuerzo | S (tablero) / XL (ejecutar el plan) |
| Dependencias | PM-001..PM-007; `99-plan-de-accion.md` |

## Supuestos y preguntas abiertas

- **Supuestos usados**: Vercel en plan Hobby e InsForge en plan gratuito (pregunta 6; `README.md:89,184` lo sugieren); ~10 h/semana en adelante (pregunta 13) aunque la cadencia observada fue de jornada completa; Alejandro trabaja solo (pregunta 14); ≤5 empresas reales (pregunta 1); sin asesoría legal (pregunta 15); InsForge sin SLA contractual.
- **Preguntas abiertas**: (1) ¿Existe copia del respaldo fuera del equipo y se intentó alguna restauración? (2) ¿Hay alguien más con acceso a Vercel, InsForge, Resend, Namecheap y GitHub, y dónde están las credenciales de recuperación? (3) ¿Cuántas horas/semana reales habrá en los próximos 3 meses y hay fecha comprometida con alguna empresa? (4) ¿Qué plan de Vercel y de InsForge está contratado y con qué tarjeta/vencimiento? (5) ¿Hay cobros o aceptaciones reales en producción ya? (6) `gh` no está instalado: protección de rama y logs de CI se consultaron por API pública (`/protection` → 401); confirmar en GitHub → Settings → Branches. (7) ¿Se quiere mantener el trabajo propio sin PR? Si sí, el tag por despliegue es el sustituto mínimo. (8) ¿Qué canal y plazo de soporte se promete a las empresas?
