# Auditoría integral de aguemar Studio

Auditoría externa de solo lectura realizada el 20/10/2026 sobre `main` = `f47ac68`, con diez perfiles. Nada del código se modificó; solo existe esta carpeta. Los hallazgos citan archivo:línea o comando + salida; lo que no se pudo verificar desde el repo está marcado como **supuesto** o **pregunta abierta**. El dev server estaba apagado, así que toda revisión "en pantalla" (axe, Lighthouse, responsive, modo oscuro) queda pendiente y señalada en cada informe.

## Cómo leerla

1. Empieza por [99-plan-de-accion.md](99-plan-de-accion.md): resumen ejecutivo, notas por área, quick wins, roadmap, backlog priorizado y preguntas abiertas.
2. Sigue con [90-sintesis.md](90-sintesis.md): doce temas transversales, conflictos entre perfiles y los cinco riesgos principales.
3. Los informes por perfil (`01`–`10`) tienen el mismo formato: diagnóstico, fortalezas, tabla de hallazgos previos verificados (de `AUDITORIA.md`), hallazgos con ID / severidad / evidencia / impacto / recomendación / esfuerzo / dependencias, y supuestos.

## Índice

| Archivo | Perfil | Hallazgos | Severidad máxima |
|---|---|---|---|
| [00-plan.md](00-plan.md) | Fase 0: plan aprobado, áreas, comandos, preguntas y ajustes | — | — |
| [01-arquitectura.md](01-arquitectura.md) | Arquitecto de Software | 10 | Alta (ARQ-001) |
| [02-calidad.md](02-calidad.md) | Tech Lead / calidad de código | 8 | Media |
| [03-producto.md](03-producto.md) | Product Owner | 11 | Alta (PRO-001/002/003) |
| [04-gestion.md](04-gestion.md) | Project Manager | 8 + matriz de 12 riesgos | Alta (PM-001/002/004) |
| [05-ux-ui.md](05-ux-ui.md) | Diseñador UX/UI | 11 | Media |
| [06-accesibilidad.md](06-accesibilidad.md) | Accesibilidad WCAG 2.2 AA | 9 | Alta (A11Y-001) |
| [07-seguridad.md](07-seguridad.md) | Ingeniero de Seguridad (AppSec) | 9 | Media |
| [08-performance-devops.md](08-performance-devops.md) | Performance / DevOps | 10 | Alta (DEV-001/002) |
| [09-qa.md](09-qa.md) | QA | 8 | Alta (QA-001/002) |
| [10-seo.md](10-seo.md) | SEO | 7 | Alta (SEO-002) |
| [90-sintesis.md](90-sintesis.md) | Síntesis cruzada | 12 temas, 8 conflictos, 5 riesgos | — |
| [95-respuestas-y-evidencia.md](95-respuestas-y-evidencia.md) | Respuestas del 21/10 y lo que muestran las capturas de Vercel, Sentry e InsForge | 4 nuevos | Alta (SEC-010) |
| [99-plan-de-accion.md](99-plan-de-accion.md) | Plan de acción (PM + PO + Arquitecto) | 15 quick wins, 4 fases, 91 ítems | — |

Totales: **95 hallazgos** (0 críticos, 14 altos, 45 medios, 36 bajos), contando los 4 añadidos el 21/10. De los 43 de `AUDITORIA.md` (16/10): 19 cerrados con evidencia nueva, 17 parciales, 5 abiertos, 2 no verificables.

## Comandos ejecutados (solo análisis)

`npm run typecheck`, `npm run lint`, `npm test`, `npm audit` (prod y completo), `NEXT_DIST_DIR=.next-verify npx next build`, `npx madge --circular`, `npx knip`, `git log -S` con patrones de secretos, `npx insforge metadata` / `advisor` (rama staging, lectura), `npx playwright test --list`, `GUARDAR_PDF=<scratchpad> npx vitest run tests/unit/pdf-*`. No se ejecutaron e2e contra staging, migraciones, deploys ni `git push`; no se descargó gitleaks.

## Siguiente paso

Los quick wins del plan (§2) toman ≈ 2,5 días y cubren tres de los cinco riesgos principales. El primero es borrar las dos funciones edge heredadas de InsForge (SEC-010, 15 minutos) y proteger `main`; Sentry ya está conectado. El que más importa es el simulacro de restauración de la base.
