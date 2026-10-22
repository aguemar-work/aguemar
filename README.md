# aguemar Studio

Sistema de **aguemar** (Alejandro Fritz Guevara Martínez, Perú) para sus tres áreas: diseño, desarrollo y soporte técnico. Tres piezas: una landing que presenta sus servicios, un panel privado donde administra empresas, trabajos, documentos y cobros, y un **workspace por empresa** (`/w/[slug]`) donde cada empresa entra con su usuario a ver sus proyectos, calendario, informes y cotizaciones según los módulos que él le active.

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS v4 · InsForge (Postgres, Auth con correo y contraseña, Storage, RLS) · `@react-pdf/renderer` · Zod + React Hook Form · Resend (opcional) · Vitest + Playwright · Vercel.

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
| `NEXT_PUBLIC_INSFORGE_URL` | sí | URL de la **rama `staging`** en local (campo `oss_host` de `.insforge/project.json`); en Vercel, la del proyecto principal |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | sí | anon key (pública) de esa misma rama o proyecto: `npx insforge secrets get ANON_KEY` |
| `NEXT_PUBLIC_SITE_URL` | sí | URL pública del sitio, usada en enlaces y OG. En producción el build falla si apunta a localhost |
| `NEXT_PUBLIC_WHATSAPP` | recomendada | número en formato internacional sin `+` |
| `RESEND_API_KEY`, `RESEND_FROM` | no | avisos por correo con Resend; sin API key no se envía nada |
| `AVISOS_PARA` | recomendada | a dónde te llegan los avisos (si falta, el correo de Mi marca). También recibe el **respaldo del formulario de contacto** cuando la base falla: sin ella, ese mensaje solo se puede reenviar por WhatsApp |
| `CRON_SECRET` | para recordatorios | secreto de la tarea diaria de recordatorios de pago (ver *Recordatorios de pago*); uno distinto en staging y en producción |
| `NEXT_PUBLIC_SENTRY_DSN` | recomendada en producción | alertas de error con Sentry (ver *Alertas de error*). Es pública por diseño (va al navegador). Sin ella Sentry queda apagado; ponla **solo en Production** |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | no | solo para subir los source maps en el build de Vercel y ver el stack del navegador legible. El token es secreto |
| `E2E_*` | solo local | cuentas de prueba de staging para Playwright: propietario, empresa A y B, colaborador (las crea `npm run staging:cuentas`) |

Nunca subas `.env.local` ni `.insforge/project.json` al repositorio. No configures en Vercel ninguna clave de servicio de InsForge: el código no la usa.

## Base de datos (InsForge)

No hace falta Docker: todo se aplica en la nube con la CLI. Hay **dos entornos**: la rama `staging` (desarrollo local, tests e2e y pruebas de migraciones, con cuentas y datos de prueba) y el proyecto principal (producción, con los datos reales). Local y e2e apuntan **siempre** a staging.

1. Inicia sesión y vincula el proyecto (una vez por máquina):

```bash
npx -y @insforge/cli login
```

```bash
npx -y @insforge/cli link --project-id <id-del-proyecto>
```

2. Cambia el contexto a la rama de staging (si no existe, créala con `npx insforge branch create staging --mode schema-only`):

```bash
npx insforge branch switch staging
```

   Copia en `.env.local` la URL y la anon key de la rama (`npx insforge secrets get ANON_KEY`).

3. Aplica las migraciones de `migrations/` (esquema, RLS y funciones):

```bash
npm run db:migrate
```

4. Crea las cuentas de prueba y los datos de ejemplo (propietario con el seed, empresa A vinculada a SGC, empresa B con su propio trabajo y un colaborador asignado solo a SGC que entra por una invitación real). El script se niega a correr contra un proyecto que no sea una rama:

```bash
npm run staging:cuentas
```

   Entra en `/login` con `E2E_EMAIL` para ver el panel o con `E2E_EMPRESA_EMAIL` para el workspace. Para usar tu propio correo en staging: `/login/recuperar` y luego `npm run db:seed -- tu@correo.com`.

5. **Producción**: solo migraciones ya probadas en staging y compatibles con el código que sigue publicado. Copia esta lista en la nota del `CHANGELOG.md` y márcala paso a paso:

   - [ ] La migración pasó en staging, `npm run db:funciones` no deja diff y CI está en verde.
   - [ ] Respaldo de producción: `npx insforge branch switch --parent`, `npm run db:respaldo -- _respaldos` y respaldo manual de InsForge (ver *Respaldos*).
   - [ ] Migrar, todavía con el contexto en producción: `npm run db:migrate`.
   - [ ] `npm run db:status` muestra lo mismo que en staging.
   - [ ] Volver a staging: `npx insforge branch switch staging`.
   - [ ] Desplegar el código que usa la migración (push a `main`).
   - [ ] Probar en producción `/`, `/login` y un `/d/<token>` de prueba.
   - [ ] Nota en `CHANGELOG.md` con la migración, la fecha, el respaldo y el tag `vX.Y.Z`.

   Si el código nuevo necesita la migración y el publicado no la soporta, se hace en dos pasos: primero una migración que acepte ambos, y la que retira lo viejo después del deploy (expand/contract).

```bash
npx insforge branch switch --parent; npm run db:migrate; npx insforge branch switch staging
```

**Empezar de cero (reinicio de datos).** `npm run db:reiniciar -- <contexto>` vacía todo lo operativo del proyecto al que apunta la CLI (empresas y accesos, trabajos, calendario, documentos, cotizaciones, cobros, aceptaciones, leads, invitaciones, colaboradores) y reinicia la numeración; conserva Mi marca, servicios, plantillas, tu usuario y `ajustes_sistema`. Exige escribir el nombre del contexto (`staging` o el del proyecto principal) y hace un respaldo en `_respaldos/` antes; si el respaldo falla, no borra. Con `--todo` vacía también la configuración (así `npm run staging:cuentas` vuelve a sembrar staging desde cero). No toca `auth.users`: los usuarios de empresa y colaboradores se borran en InsForge → Auth → Users. Para producción:

```bash
npx insforge branch switch --parent; npm run db:reiniciar -- Project_AGUEMAR; npx insforge branch switch staging
```

Convenciones de migraciones: se crean con `npx insforge db migrations new <nombre-en-kebab>`, no llevan `BEGIN/COMMIT`, y no usan bloques `DO` con SQL dinámico ni `set_config` (la CLI los rechaza). `npm run db:status` muestra el historial remoto del contexto actual. Si staging queda inservible, `npx insforge branch reset staging` la devuelve al estado inicial y `npm run staging:cuentas` la vuelve a poblar.

La primera migración (`20261013171105_limpiar-esquema-sgtd.sql`) es una limpieza única del sistema anterior (SGTD): todos sus `DROP` llevan `IF EXISTS`, así que en una base nueva no hace nada. Se conserva en la cadena porque ya está registrada como aplicada en staging y producción y moverla desalinearía el historial; no se edita ni se copia.

**Errores de las funciones SQL.** Un `raise exception` solo llega a la app con su mensaje si su `errcode` es `P0001` (el predeterminado), `P0002`, de la clase `22` o `42501`. Cualquier otro código (la clase `53`, otros `P0xxx`) lo devuelve InsForge como el texto "Something went wrong", sin código ni mensaje. Para distinguir dos casos con el mismo código usa `hint` (viaja hasta la app): ver `crear_lead` y `tests/e2e/seguridad.spec.ts`.

Después de una migración que cree o cambie funciones, corre `npm run db:funciones`: vuelca la definición vigente de cada función a `db/funciones/<nombre>.sql` para leerla y revisarla en el diff sin recorrer todas las migraciones (se commitea junto con la migración; un test falla si quedó desactualizada). El mismo test revisa que toda función `security definer` fije `search_path`, revoque PUBLIC y que `anon` solo llegue a las funciones públicas por diseño.

### Respaldos

El plan gratuito de InsForge guarda **un solo respaldo manual** y no hace respaldos programados: lo que no se exporta, no está respaldado.

1. **Antes de cada migración en producción**, y al menos una vez por semana, exporta la base del proyecto principal fuera de InsForge a `_respaldos/` (ignorada por git) o a otra carpeta fuera del repo. El script guarda `aguemar-<proyecto>-AAAA-MM-DD-HHMM.sql` con esquema, funciones y todas las filas, rechaza carpetas del repo que git no ignore y avisa si alguna tabla llega al tope de 10 000 filas de la CLI:

   ```bash
   npx insforge branch switch --parent; npm run db:respaldo -- _respaldos; npx insforge branch switch staging
   ```

   El export **no incluye las cuentas** (`auth.users`): te protege de tus propios errores (un borrado, una migración equivocada) y te permite llevarte los datos a otro proveedor. Para recuperarte de una pérdida total hace falta además el respaldo de InsForge del punto 2.
2. Renueva también el respaldo manual de InsForge, que es una copia completa con las cuentas: `npx insforge backups list --project <id-producción>`, borra el anterior (`backups delete`) y `npx insforge backups create --project <id-producción> --name <fecha> --wait`.
3. **Una vez por trimestre, prueba restaurar** en una rama desechable que borras al terminar (`npx insforge branch delete <rama>`); un respaldo que nunca se restauró no está probado. Ojo: las tablas apuntan a `auth.users`, así que el export solo entra completo donde existen las mismas cuentas. `[PENDIENTE: primer simulacro — fijar aquí los pasos que funcionen (rama --mode schema-only desde producción + db import, o backups restore sobre una rama)]`

Los exports tienen datos personales de tus clientes (Ley 29733): nunca se commitean. Copia periódicamente los de `_respaldos/` a un lugar fuera de este equipo (idealmente cifrado), para que una falla del disco no se lleve la base y su respaldo a la vez.

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
| `npm run test:e2e` | flujos con Playwright contra staging (requiere `npm run dev` corriendo en otra terminal) |
| `npm run db:migrate` | aplica las migraciones pendientes |
| `npm run db:status` | historial de migraciones remoto |
| `npm run db:funciones` | vuelca la definición vigente de cada función SQL a `db/funciones/` |
| `npm run db:respaldo -- _respaldos` | exporta la base del contexto actual fuera de InsForge (ver Respaldos) |
| `npm run db:seed -- correo` | carga los datos de ejemplo para ese propietario |
| `npm run staging:cuentas` | crea las cuentas de prueba y los datos de ejemplo en la rama staging (nunca en producción) |
| `npm run logo` | recorta el logo desde `LOGO.svg` |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno: `NEXT_PUBLIC_INSFORGE_URL` y `NEXT_PUBLIC_INSFORGE_ANON_KEY` del **proyecto principal** (no de la rama staging), `NEXT_PUBLIC_SITE_URL` con el dominio final (obligatoria: el build falla si apunta a localhost), `NEXT_PUBLIC_WHATSAPP` y, si quieres avisos, las de Resend.
3. Cada push a `main` publica solo. Antes, GitHub Actions (`.github/workflows/ci.yml`) corre tipos, lint, tests y build en cada PR y en `main`; en GitHub → Settings → Branches, protege `main` exigiendo el check `verificar` para que nada se despliegue en rojo. El job `seguridad` corre `tests/e2e/seguridad.spec.ts` (aislamiento entre empresas e inmutabilidad de lo aceptado) contra la rama staging; necesita en GitHub → Settings → Secrets and variables → Actions los secretos `STAGING_INSFORGE_URL`, `STAGING_INSFORGE_ANON_KEY` y los `E2E_*` de propietario, empresa A y empresa B (los mismos valores de staging de tu `.env.local`, **nunca** los de producción). Sin ellos, el job se salta con un aviso.
4. Las migraciones no las aplica Vercel: se prueban en staging y se aplican a producción a mano (sección Base de datos, paso 5), siempre compatibles con el código que sigue publicado.

### Correos (Resend)

1. Crea la cuenta en resend.com y, en **Domains**, agrega `aguemar.com`.
2. Copia en Namecheap (Advanced DNS) los registros que te muestra Resend: el TXT de DKIM `resend._domainkey`, los CNAME `send` y `rsend` (Resend ya no usa MX) y el TXT `_dmarc`. No toques el registro `korax`.
3. Cuando el dominio aparezca como verificado, crea una API key y agrégala en Vercel (y en `.env.local` si quieres probar en local): `RESEND_API_KEY`, `RESEND_FROM="aguemar <avisos@aguemar.com>"` y, opcional, `AVISOS_PARA`.
4. Vuelve a desplegar. Sin dominio verificado, Resend solo deja enviar a tu propio correo (`RESEND_FROM="aguemar <onboarding@resend.dev>"`).

| Aviso | Para | Cuándo |
|---|---|---|
| Nuevo lead | ti | alguien escribe en el formulario de la landing |
| Comentario / solicitud | ti | una empresa comenta o pide un trabajo |
| Aceptación | ti | aceptan una cotización o un acta (en su espacio o por enlace) |
| Documento publicado | empresa | publicas una ficha, brief, acta o informe, o envías una cotización |
| Respuesta | empresa | respondes un comentario o una solicitud |
| Recordatorio de pago | empresa | 3 días antes de que venza un saldo, al día 1 y al día 7 de atraso (tarea diaria) |

Los correos salen después de responder (`after()`), así que no hacen más lenta ninguna acción. Cada empresa puede quedar sin avisos desde su ficha (Módulos → Avisos por correo).

### Recordatorios de pago

Cada cotización aceptada vence a los `plazo_pago_dias` de su aceptación (por defecto, el plazo de Mi marca). Todos los días a las 9:00 (Lima) Vercel Cron llama a `/api/cron/recordatorios` (`vercel.json`) con `Authorization: Bearer <CRON_SECRET>`. La ruta pasa el secreto a `cobro_recordatorios_tomar`, que compara su hash con `ajustes_sistema.cron_hash`, registra cada recordatorio una sola vez y devuelve los datos del correo; los que no salen se devuelven con `cobro_recordatorios_fallidos` y se reintentan al día siguiente. No hace falta clave de servicio. Solo se recuerdan las cotizaciones con "Recordar pago" activo, de empresas activas y con avisos por correo.

Para activarlo en un entorno (staging y producción llevan secretos distintos):

1. Genera el secreto: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` y guárdalo como `CRON_SECRET` (en Vercel → Environment Variables para producción; en `.env.local` para staging).
2. Calcula su hash: `node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" <secreto>`.
3. Cárgalo en la base de ese entorno: `npx insforge db query "insert into public.ajustes_sistema (clave, valor) values ('cron_hash', '<hash>') on conflict (clave) do update set valor = excluded.valor, updated_at = now()"`.

Para probarlo en local (con `npm run dev` corriendo): `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/recordatorios`.

### Alertas de error (Sentry)

Los errores 500 del servidor (Server Components, Server Actions, Route Handlers, middleware) llegan por `onRequestError` (`src/instrumentation.ts`) y los del navegador por `src/instrumentation-client.ts` y las páginas `error.tsx` (`useReportarError`). También se reportan los avisos por correo que fallan y cada lead que se salvó por el respaldo. `src/lib/sentry.ts` limpia cada evento antes de enviarlo: sin usuario, IP, cookies, cabeceras, cuerpo, query ni breadcrumbs; los tokens de `/d/…` e `/invitacion/…` salen como `[token]` y los correos, DNI y RUC de los mensajes se reemplazan. Sin trazas ni Session Replay (plan gratuito).

1. Crea una cuenta en sentry.io (plan Developer, gratis) y un proyecto **Next.js**. Copia el **DSN** (Settings → Client Keys).
2. En Vercel → Settings → Environment Variables agrega `NEXT_PUBLIC_SENTRY_DSN` solo para **Production**.
3. Opcional, para ver el stack del navegador legible: crea un token en Sentry (Settings → Auth Tokens, permiso de releases y source maps) y agrega `SENTRY_AUTH_TOKEN` (secreto), `SENTRY_ORG` y `SENTRY_PROJECT` (los nombres cortos que salen en la URL de Sentry).
4. **Redeploy** del último despliegue: las variables nuevas solo entran en un build nuevo.
5. En Sentry → Alerts, deja activa la regla por defecto "nuevo issue → correo". Llega en uno o dos minutos.

### Analítica sin cookies

- **Visitas y procedencia:** Vercel Web Analytics (`<Analytics />` solo en la landing). Actívalo en Vercel → Analytics → Enable; no usa cookies ni guarda la IP. En el plan Hobby no admite eventos propios, por eso los clics se cuentan aparte.
- **Clics y formulario:** `src/components/landing/medicion.tsx` cuenta los enlaces con `data-evento` (`whatsapp_click`, `correo_click`) en `/api/evento`; `enviarContacto` cuenta `contacto_enviado`. Todo va a `registrar_evento()`, que suma uno al total del día por evento y origen en `eventos_landing` (sin IP ni una fila por visitante, tope de 500 por fila y día). El resumen de 30 días está en `/panel/leads`.
- **Origen del lead:** al entrar, la landing guarda en `sessionStorage` el dominio que trajo a la persona y las UTM; el formulario lo manda y `crear_lead(p_origen)` lo guarda saneado en `leads.origen/referente/utm`. Para medir una campaña, comparte el enlace con UTM, por ejemplo `https://aguemar.com/?utm_source=instagram&utm_medium=bio`.

### CSP en modo reporte

`next.config.ts` manda `Content-Security-Policy-Report-Only` en producción (`src/lib/csp.ts`): no bloquea nada y los reportes llegan a Sentry (Issues → tipo CSP). Cuando pasen unas semanas sin reportes inesperados, se puede pasar a `Content-Security-Policy` con nonces.

## Estructura

```
src/app            rutas (landing, login, api/auth/refresh, api/cron/recordatorios, panel/* con @modal para el panel lateral, w/[slug], d/[token])
src/components     ui (base shadcn adaptada), panel, brand
src/lib            insforge (server, client, middleware), format (es-PE, America/Lima), validators, env
src/types          tipos de las tablas
migrations         migraciones SQL (InsForge CLI)
db                 seed.sql
scripts            crop-logo.mjs, seed.mjs, staging.mjs
tests              unit (Vitest), e2e (Playwright)
_respaldos         respaldos de la base (npm run db:respaldo; ignorado por git)
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
11. ✅ Avisos por correo (Resend), páginas 404 y de error, cabeceras de seguridad, índices sugeridos por el advisor de InsForge, prueba de aislamiento del workspace y guía de despliegue.
