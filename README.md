# agueMar Studio

Sistema de **agueMar** (Alejandro Fritz Guevara Martínez, Perú) para sus tres áreas: diseño, desarrollo y soporte técnico. Tres piezas: una landing que presenta sus servicios, un panel privado donde administra empresas, trabajos, documentos y cobros, y un **workspace por empresa** (`/w/[slug]`) donde cada empresa entra con su usuario a ver sus proyectos, calendario, informes y cotizaciones según los módulos que él le active.

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS v4 · InsForge (Postgres, Auth con correo y contraseña, Storage, RLS) · `@react-pdf/renderer` · Zod + React Hook Form · Resend (opcional) · Vitest + Playwright · Vercel.

## Instalación

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` (ver abajo) y arranca:

```bash
npm run dev
```

Sin variables de InsForge la app compila igual y muestra un aviso en el panel y en el login; no habrá sesión ni datos.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | sí | URL del proyecto (campo `oss_host` de `.insforge/project.json`) |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | sí | anon key (pública): `npx -y @insforge/cli secrets get ANON_KEY` |
| `INSFORGE_API_KEY` | solo servidor | tareas administrativas (recordatorios, vencimientos). Equivale a una service role |
| `NEXT_PUBLIC_SITE_URL` | sí | URL pública del sitio, usada en enlaces y OG |
| `NEXT_PUBLIC_WHATSAPP` | recomendada | número en formato internacional sin `+` |
| `RESEND_API_KEY`, `RESEND_FROM`, `LEADS_NOTIFY_TO` | no | envío de correos con PDF y avisos de leads |
| `CRON_SECRET` | no | protege la ruta de tareas programadas |

Nunca subas `.env.local` ni `.insforge/project.json` al repositorio.

## Base de datos (InsForge)

No hace falta Docker: todo se aplica al proyecto en la nube con la CLI.

1. Inicia sesión y vincula el proyecto (una vez por máquina):

```bash
npx -y @insforge/cli login
```

```bash
npx -y @insforge/cli link --project-id <id-del-proyecto>
```

2. Aplica las migraciones de `migrations/` (esquema, RLS y funciones):

```bash
npm run db:migrate
```

3. Crea tu contraseña en `/login/recuperar` (el correo debe existir como usuario del proyecto), entra en `/login` y luego carga el seed con ese mismo correo:

```bash
npm run db:seed -- tu@correo.com
```

   El seed crea el perfil de marca, los servicios, las plantillas de checklist, el cliente SGC, su equipo Lenovo y la ficha FT-2026-001.

Convenciones de migraciones: se crean con `npx -y @insforge/cli db migrations new <nombre-en-kebab>`, no llevan `BEGIN/COMMIT`, y no usan bloques `DO` con SQL dinámico (la CLI los rechaza). `npm run db:status` muestra el historial remoto.

## Autenticación

Acceso con correo y contraseña. La primera vez (o si la olvidaste) entra a `/login/recuperar`: InsForge envía un código de 6 dígitos al correo y con él se fija la contraseña. El login y el logout se ejecutan en Server Actions con `createAuthActions`; el middleware refresca la sesión con `updateSession` y la ruta `/api/auth/refresh` renueva el token para el cliente de navegador.

## Logo

Copia `LOGO.svg` (exportado de CorelDRAW, lienzo A4) en la raíz y ejecuta:

```bash
npm run logo
```

Genera `public/logo.svg` (viewBox recortado) y `public/logo-light.svg` (blanco para fondos oscuros). Mientras no exista `LOGO.svg`, hay un logo provisional.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` / `npm start` | build y servidor de producción (detén el dev server antes del build) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | tests unitarios (Vitest) |
| `npm run test:e2e` | flujos con Playwright (requiere `npm run dev` corriendo en otra terminal) |
| `npm run db:migrate` | aplica las migraciones pendientes |
| `npm run db:status` | historial de migraciones remoto |
| `npm run db:seed -- correo` | carga los datos de ejemplo para ese propietario |
| `npm run logo` | recorta el logo desde `LOGO.svg` |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno (las mismas de `.env.local`, con `NEXT_PUBLIC_SITE_URL` apuntando al dominio final).
3. Despliega. Las tareas programadas (vencimiento de cotizaciones, recordatorios) se configuran en la fase 11 con Vercel Cron o con las schedules de InsForge.

## Estructura

```
src/app            rutas (landing, login, api/auth/refresh, panel/* con @modal para el panel lateral, w/[slug], d/[token])
src/components     ui (base shadcn adaptada), panel, brand
src/lib            insforge (server, client, middleware), format (es-PE, America/Lima), validators, env
src/types          tipos de las tablas
migrations         migraciones SQL (InsForge CLI)
db                 seed.sql
scripts            crop-logo.mjs, seed.mjs
tests              unit (Vitest), e2e (Playwright)
_respaldos         volcados locales (ignorado por git)
```

## Fases

1. ✅ Base, auth, migraciones.
2. ✅ Empresas (clientes), equipos, servicios, marca.
3. ✅ Trabajos: lista, tablero, etapas, tareas, entregables.
4. ✅ Empresas y workspaces: acceso por empresa, módulos, `/w/[slug]`, proyectos, comentarios, bandeja.
5. ✅ Velocidad y fluidez: panel lateral, cambios al instante, inicio con lo que pide atención, Mi marca con vista previa.
6. ✅ Cotizaciones y cobros: ítems desde servicios, PDF con la marca, aceptación que crea el trabajo, cobros y saldo.
7. Documentos: 7a ✅ fichas técnicas con diagnóstico (`public/diagnostico-agueMar.ps1`), PDF con QR y portal por enlace; 7b ✅ briefs y actas de entrega (aceptación que marca el trabajo como entregado).
8. ✅ Calendario (actividades, entregas y mantenimientos) y solicitudes de las empresas.
9. ✅ Informes de avance: por empresa y periodo, armados con lo registrado (tareas, actividades, fichas), PDF, enlace público y comentarios de la empresa.
10. ✅ Landing de una página con servicios por área, contacto (leads con conversión a empresa en el panel) y SEO.
11. Notificaciones por correo, pulido, tests completos y despliegue en Vercel con aguemar.com.
