# agueMar Studio

Sistema de la marca de soporte técnico **agueMar** (Alejandro Guevara Martínez, Perú): landing pública, panel privado para clientes, cotizaciones y fichas técnicas, y portal donde el cliente ve y acepta sus documentos.

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS v4 · Supabase (Postgres, Auth con enlace mágico, Storage, RLS) · `@react-pdf/renderer` · Zod + React Hook Form · Resend (opcional) · Vitest + Playwright · Vercel.

## Instalación

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` (ver abajo) y arranca:

```bash
npm run dev
```

Sin variables de Supabase la app compila igual y muestra un aviso en el panel y en el login; no habrá sesión ni datos.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | anon key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo servidor | tareas administrativas (recordatorios, vencimientos) |
| `NEXT_PUBLIC_SITE_URL` | sí | URL pública del sitio, usada en enlaces de correo y OG |
| `NEXT_PUBLIC_WHATSAPP` | recomendada | número en formato internacional sin `+` |
| `RESEND_API_KEY`, `RESEND_FROM`, `LEADS_NOTIFY_TO` | no | envío de correos con PDF y avisos de leads |
| `CRON_SECRET` | no | protege la ruta de tareas programadas |

Nunca subas `.env.local` al repositorio.

## Base de datos (Supabase)

Las migraciones están en `supabase/migrations` y el seed en `supabase/seed.sql`. No hace falta Docker.

1. Crea un proyecto en [supabase.com](https://supabase.com) y copia URL y anon key a `.env.local`.
2. En **Authentication → URL Configuration** agrega `http://localhost:3000/auth/callback` (y la URL de producción) a *Redirect URLs*.
3. Aplica las migraciones con la CLI:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

   O pega el contenido de `0001_base.sql`, `0002_rls.sql` y `0003_funciones.sql`, en ese orden, en el **SQL Editor**.

4. Inicia sesión una vez desde `/login` (crea tu usuario en `auth.users`) y luego ejecuta `supabase/seed.sql` en el SQL Editor. El seed toma el primer usuario como propietario y crea el perfil de marca, los servicios, la plantilla de checklist, el cliente SGC, su equipo Lenovo y la ficha FT-2026-001.

Regenerar los tipos cuando cambie el esquema:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

## Logo

Copia `LOGO.svg` (exportado de CorelDRAW, lienzo A4) en la raíz y ejecuta:

```bash
node scripts/crop-logo.mjs
```

Genera `public/logo.svg` (viewBox recortado) y `public/logo-light.svg` (blanco para fondos oscuros). Mientras no exista `LOGO.svg`, hay un logo provisional.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` / `npm start` | build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | tests unitarios (Vitest) |
| `npm run test:e2e` | flujos con Playwright (levanta `npm run dev` solo) |
| `npm run logo` | recorta el logo desde `LOGO.svg` |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno (las mismas de `.env.local`, con `NEXT_PUBLIC_SITE_URL` apuntando al dominio final).
3. En Supabase, agrega `https://<tu-dominio>/auth/callback` a *Redirect URLs*.
4. Despliega. Las tareas programadas (vencimiento de cotizaciones, recordatorios) se configuran en la Fase 8 con Vercel Cron.

## Estructura

```
src/app            rutas (landing, login, auth/callback, panel/*, d/[token])
src/components     ui (base shadcn adaptada), panel, brand
src/lib            supabase, format (es-PE, America/Lima), validators, env
src/types          tipos de la base de datos
supabase           migraciones, seed, config
scripts            crop-logo.mjs
tests              unit (Vitest), e2e (Playwright)
```

## Fases

1. ✅ Base: proyecto, tokens, logos, layout del panel, auth y migraciones con RLS.
2. Clientes, equipos, servicios y Mi marca.
3. Cotizaciones con vista previa, PDF, numeración y estados.
4. Fichas técnicas con plantillas, PDF y vínculo con equipos.
5. Importar diagnóstico (`diagnostico-agueMar.ps1`).
6. Portal del cliente: tokens, aceptación y QR.
7. Landing pública, formulario de contacto y leads.
8. Recordatorios, correo, pulido, tests completos y Vercel.
