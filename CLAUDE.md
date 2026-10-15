# agueMar Studio — guía para Claude Code

## Rol

Eres un ingeniero full-stack senior y diseñador de producto. Construyes **agueMar Studio** para Alejandro Fritz Guevara Martínez (marca: agueMar, Perú), que trabaja en tres áreas: **diseño**, **desarrollo** y **soporte técnico**. La idea es simple y tiene tres piezas:

| Pieza | Para quién | Ruta | Qué hace |
|---|---|---|---|
| **Landing** | público | `/` | Una sola página que presenta a agueMar: áreas, servicios, cómo trabaja, contacto. Botón "Ingresar". |
| **Panel** | Alejandro (propietario) | `/panel/*` | Administra empresas, sus accesos y módulos; crea trabajos, actividades, informes, documentos, cotizaciones y cobros; responde comentarios y solicitudes. |
| **Workspace** | cada empresa que atiende (SGC, BELMANGROUP…) con **un usuario por empresa** | `/w/[slug]/*` | La empresa ve solo lo suyo según los **módulos que Alejandro le activa**, comenta y crea solicitudes. |

Un solo login en `/login`: propietario → `/panel`; usuario de empresa → `/w/[slug]`; otro → `/sin-acceso`.

Trabaja por fases. Al terminar cada fase: ejecuta el proyecto, corre los tests, revisa la UI en escritorio y móvil, y resume qué hiciste y qué falta. No avances a la siguiente fase con errores de compilación, de tipos o de lint. Antes de escribir código de una fase, presenta un plan breve y espera confirmación. Si algún dato del negocio falta, usa `[PENDIENTE: …]` en lugar de inventarlo.

## Stack

- Next.js 15 (App Router) + TypeScript estricto.
- Tailwind CSS v4 (tokens en `src/app/globals.css` con `@theme`). Componentes propios; shadcn/ui solo como base adaptada a la marca.
- InsForge (`@insforge/sdk`, entrypoint `@insforge/sdk/ssr`): Postgres, Auth (correo + contraseña; recuperación por código en /login/recuperar) y Storage. RLS en todas las tablas. Proyecto `Project_AGUEMAR` vinculado en `.insforge/project.json` (no se commitea).
- PDF con `@react-pdf/renderer`: A4 vectorial, texto seleccionable, fuentes embebidas.
- Zod + React Hook Form. Resend opcional para correos. Vitest y Playwright. Vercel.

## Identidad de marca

| Token | Hex | Uso |
|---|---|---|
| ink | #0A0F1A | Texto principal, fondos oscuros, portada de documentos |
| mint | #1CE783 | Acento: indicadores, detalles, botones sobre fondo oscuro |
| mint-ink | #0A6B3B | Verde para texto sobre fondo claro (contraste AA) |
| mint-soft | #E3FAEF | Fondo de etiquetas "Óptimo" o "Resuelto" |
| warn / warn-soft | #7A4F00 / #FFF3DC | Estados "Mejorable" o "Pendiente" |
| muted | #4A5263 | Texto secundario |
| line | #E2E5EB | Bordes |
| soft | #F5F7FA | Fondos de bloques |

Tipografía: Sora (400–700) y JetBrains Mono (números de documento, códigos, series, montos), con `next/font`. Logo: `LOGO.svg` → `public/logo.svg` (viewBox `4470 12270 12720 5835`) y `public/logo-light.svg`; script `scripts/crop-logo.mjs`; mientras no exista `LOGO.svg` hay un logo provisional. Rasgo visual: corchetes `< >` grandes y semitransparentes en portadas y heros; títulos de sección de documentos con numeración mono verde (00, 01…). Tono cercano, directo, español neutro de Perú, tuteando. Modo claro y oscuro en panel y workspace; los PDF siempre claros.

## Áreas

Enum `area`: `diseno`, `desarrollo`, `soporte`. Cada servicio, trabajo y documento pertenece a un área; se distingue con una etiqueta mono (`// diseño`).

## Workspace de una empresa

Módulos activables por empresa (`clientes.modulos text[]`); la navegación del workspace se arma con los activos y un módulo inactivo responde 404:

| Módulo | Clave | La empresa ve | Puede |
|---|---|---|---|
| Inicio | siempre | próximas actividades, proyectos activos con avance, últimos informes, pendientes de pago, respuestas a sus comentarios | — |
| Calendario | `calendario` | actividades por mes y lista (trabajos planificados, reuniones, publicaciones, mantenimientos, entregas) | comentar |
| Proyectos | `proyectos` | sus trabajos visibles con estado, etapas, tareas y entregables | comentar |
| Informes | `informes` | informes de avance publicados, con PDF | comentar |
| Documentos | `documentos` | fichas técnicas, briefs y actas publicadas, con PDF | aceptar acta |
| Cotizaciones y cobros | `cotizaciones` | cotizaciones enviadas, cobros y saldo | aceptar cotización |
| Equipos | `equipos` | inventario de sus equipos con historial de fichas | — |
| Solicitudes | `solicitudes` | sus pedidos de trabajo y su estado | crear solicitud |

**Seguridad:** el usuario de la empresa **no tiene políticas sobre las tablas**. Todo lo que ve y escribe pasa por funciones SQL `security definer` con prefijo `ws_` que resuelven su empresa desde `auth.uid()` (`clientes.usuario_id`), filtran por esa empresa y por visible/publicado, y proyectan solo columnas seguras (nunca notas internas ni montos estimados). El propietario usa RLS por `owner_id` sobre las tablas.

## Panel del propietario

- **Empresas** (tabla `clientes`): datos, RUC/DNI validados, `slug`, `activa`, `modulos` y el **acceso** (usuario de InsForge creado desde el panel con correo y contraseña inicial; "restablecer contraseña" vía `ws_admin_set_password`). Ficha con historial: trabajos, equipos, documentos, cotizaciones, comentarios y solicitudes.
- **Equipos** (soporte): por empresa; serie única por empresa; historial de fichas.
- **Servicios**: catálogo con área, precio base, unidad, visible en la landing.
- **Trabajos**: eje del sistema. Área, empresa, título, estado (`propuesta`, `en_curso`, `en_revision`, `entregado`, `cerrado`, `cancelado`), prioridad, fechas, monto estimado, `visible_empresa`; etapas con tareas; entregables. Lista, tablero y detalle con comentarios.
- **Calendario**: actividades por empresa (tipo, fecha, horas, estado, visible, vínculo a trabajo). Vista mes y lista.
- **Informes**: `INF-AAAA-NNN`, por empresa y periodo; resumen, indicadores (≤4), contenido en secciones; borrador → publicado; PDF.
- **Documentos**: ficha técnica `FT-AAAA-NNN` (equipo, diagnóstico importado de `diagnostico-agueMar.ps1`, checklist por plantilla, incidencias, recomendaciones, próximo mantenimiento), brief `BR-AAAA-NNN`, acta de entrega `AE-AAAA-NNN`; `publicado` los muestra en el workspace; portal por token `/d/[token]` para compartir sin login (noindex, QR).
- **Cotizaciones y cobros**: `COT-AAAA-NNN`; ítems elegidos del catálogo de **servicios** (descripción, unidad y precio se llenan solos y se pueden editar) o líneas libres; IGV configurable en céntimos enteros, PDF con vista previa, estados, aceptación con nombre y DNI. **Al aceptarse (en el panel o en el workspace) crea el trabajo** con empresa, área, título y monto, vinculado a la cotización. Cobros con medio y referencia; saldo por empresa (alimenta "por cobrar" del inicio).
- **Inicio** (dashboard): solo lo que pide atención, en una sola llamada (`panel_resumen()`): entregas vencidas y de la semana, tareas vencidas, comentarios sin leer, cotizaciones sin respuesta, por cobrar, trabajos sin movimiento, carga por área, mantenimientos.
- **Bandeja**: comentarios sin leer y solicitudes de todas las empresas; responder en línea; convertir solicitud en trabajo.
- **Mi marca**: vista previa en vivo de la portada y el cierre de los documentos; nombre comercial, responsable y cargo, RUC, contacto, IGV, moneda, validez, condiciones, datos de pago, plantillas de checklist.

## Documentos PDF

A4, márgenes laterales 56 px a 96 dpi. Portada oscura con logo claro; tipo, número y fecha en mono; rótulo mono verde con `//` y el área; titular blanco; resumen; píldora de estado. Corchetes al 12 % arriba a la derecha. Páginas siguientes con encabezado delgado y pie "agueMar · <área>" + "NN / TT". Filas que no se cortan, encabezados repetidos, títulos nunca huérfanos. Cierre con conformidad (dos firmas) y tarjeta de contacto. Archivo `{NUMERO}_{Empresa}.pdf`.

## Modelo de datos (InsForge / Postgres)

Tablas con `id uuid`, `owner_id`, `created_at`, `updated_at`: perfil_marca, clientes (empresas: + slug, usuario_id, modulos, activa), equipos, servicios (area), trabajos (+ visible_empresa), trabajo_etapas, trabajo_tareas, trabajo_entregables, actividades, informes, comentarios (entidad, entidad_id, autor_uid, es_propietario, leido), solicitudes, cotizaciones, cotizacion_items, cobros, fichas, ficha_diagnosticos, ficha_trabajos, ficha_incidencias, ficha_recomendaciones, briefs, actas_entrega, plantillas_checklist, leads, enlaces_publicos, aceptaciones, contadores (tipos `COT`, `FT`, `BR`, `AE`, `INF`).

RLS: `owner_id = auth.uid()`. Workspace y portal solo vía funciones `security definer` (`ws_*`, `portal_*`) con `search_path = pg_catalog, public, pg_temp`. Montos en céntimos enteros. Migraciones en `migrations/` (`npx -y @insforge/cli db migrations new <nombre>` y `up --all`; sin `BEGIN/COMMIT`; sin bloques `DO` con `EXECUTE`). Seed en `db/seed.sql` (`npm run db:seed -- correo@propietario`) con la empresa SGC, su Lenovo 83LT (serie PF5Y6DJT) y la ficha FT-2026-001 (SSD 0 % desgaste, batería 99,7 % con 392 ciclos, 0 errores de integridad, 3/3 incidencias: error 0x80073D02 por WhatsApp Beta, imágenes no visibles en Office, Nitro PDF sin aceptar contraseñas por captura de teclado remota).

## Calidad

Responsivo desde 360 px. Accesible (teclado, foco visible, etiquetas, AA). Estados vacíos accionables y errores explicativos. Confirmación al guardar y aviso al salir con cambios. Fechas `dd/mm/aaaa`, zona `America/Lima`, montos `es-PE` (S/ 1 234,50). Tests Vitest (cálculos, numeración, RUC/DNI, slug) y Playwright (crear empresa y acceso, entrar como empresa, crear trabajo, cotización + PDF, aceptar, crear ficha). En cada fase con workspace: verificar que la empresa no ve datos de otra, ni trabajos ocultos, ni notas internas, y que no escribe en tablas directamente. Sin secretos en el repo.

## Fases

1. ✅ Base, auth, migraciones.
2. ✅ Clientes (empresas), equipos, servicios, marca.
3. ✅ Trabajos: lista, tablero, etapas, tareas, entregables.
4. ✅ Empresas y workspaces: slug, acceso, módulos; login por rol; `/w/[slug]`; inicio; módulo Proyectos; comentarios; bandeja.
5. ✅ Velocidad y fluidez: identidad sin red, consultas en paralelo, `panel_resumen()`, panel lateral (crear, editar y ver sin cambiar de página), cambios optimistas, esqueletos de carga, inicio como dashboard de atención, Mi marca con vista previa, favicon.
6. ✅ Cotizaciones y cobros: ítems desde servicios, IGV (totales calculados por triggers en la base), PDF, aceptación que crea el trabajo (`cotizacion_aceptar_core`), cobros parciales y saldo por empresa; módulo Cotizaciones del workspace.
7. Documentos.
   - 7a ✅ Fichas técnicas: script `public/diagnostico-agueMar.ps1` (JSON), importador (`src/lib/diagnostico.ts`), editor con plantillas, PDF con QR, publicar, portal `/d/[token]` (fichas publicadas y cotizaciones enviadas, aceptación con DNI), módulos Documentos y Equipos.
   - 7b ✅ Briefs (`BR-`) y actas de entrega (`AE-`): desde el trabajo, PDF, publicar y enlace; el acta se acepta en el workspace, por enlace o desde el panel, y el trabajo pasa a entregado. Listado general en `/panel/documentos`.
8. ✅ Calendario y solicitudes: actividades por empresa (mes y lista, `panel_calendario` / `ws_calendario` suman entregas de trabajos y mantenimientos), comentarios en actividades, solicitudes desde el workspace (`ws_solicitar`) que en la Bandeja se responden o convierten en trabajo o cotización; agenda de la semana en el inicio.
9. ✅ Informes de avance (`INF-`): por empresa y periodo (opcionalmente un trabajo); “Armar con lo del periodo” llena resumen, indicadores y secciones desde `panel_informe_periodo` (`src/lib/informe.ts`); PDF, publicar, enlace público, módulo Informes del workspace con comentarios; últimos informes en el inicio de la empresa.
10. ✅ Landing (`src/app/page.tsx`, estática con `revalidate` y regenerada al guardar servicios o Mi marca): portada, servicios por área desde `landing_datos()` (anon, solo datos públicos), cómo trabajo, tu espacio, contacto con formulario (`enviarContacto` → `crear_lead`, trampa para bots, 5 por hora e IP) y WhatsApp; SEO con metadatos, JSON-LD, `robots.ts`, `sitemap.ts` y `opengraph-image.tsx`. Leads en `/panel/leads`: contactar, marcar contactado y convertir en empresa.
11. ✅ Avisos por correo con Resend (`src/lib/correo/*`: plantilla, envío por API REST y avisos con `after()`; sin `RESEND_API_KEY` no se envía nada; `clientes.avisos_correo` por empresa), 404 y error con la marca, cabeceras de seguridad en `next.config.ts`, índices del advisor, `tests/e2e/seguridad.spec.ts` (la empresa no lee ni escribe tablas) y guía de despliegue en el README.

## Convenciones del repo

- Código y comentarios en español; identificadores en español salvo APIs externas. En la UI el cliente se llama **empresa**; la tabla sigue siendo `clientes`.
- Backend en InsForge (sin Docker local). Esquema y RLS solo por migraciones; `db query` solo para datos.
- Auth SSR: `createServerClient` en Server Components, `createAuthActions` en Server Actions, `updateSession` en el middleware, `/api/auth/refresh`. Rol por `obtenerRol()` en `src/lib/insforge/server.ts`.
- Datos del propietario en `src/lib/datos/*`; datos del workspace en `src/lib/datos/workspace.ts` (solo `rpc("ws_…")`). Server Actions por módulo en `acciones.ts` que devuelven `Resultado<T>`; errores traducidos en `src/lib/insforge/errores.ts`.
- Formularios: React Hook Form + Zod (`src/lib/validators/*`), `Campo`/`propsCampo`, `BarraAcciones`, `useAvisoCambios`.
- Sin variables de InsForge, la app compila y muestra un aviso.
- **El servidor de desarrollo lo arranca y detiene el usuario en su máquina** (`npm run dev`). Claude no lo inicia, reinicia ni detiene, ni usa el preview integrado para levantarlo; verifica contra http://localhost:3000 cuando esté corriendo. No correr `npm run build` con ese servidor activo (comparten `.next`): pedirle que lo detenga antes.
- **Velocidad** (InsForge está en us-east: cada ida y vuelta cuesta 0,35–0,6 s desde Perú): la identidad sale de los claims del token (`obtenerUsuario`, sin red) y `obtenerRol` se calcula una vez por petición (`cache` de React); las consultas de una página van en un solo `Promise.all`; los resúmenes se arman en una función SQL (`panel_resumen()`); después de una Server Action que revalida **no** se llama `router.refresh()` (la respuesta ya trae la página nueva); checks e interruptores con `useOptimistic`; `loading.tsx` con esqueletos (`src/components/panel/esqueleto.tsx`). `npm run dev` usa Turbopack.
- **Panel lateral**: crear, editar y ver se abre sobre la lista con rutas interceptadas en `src/app/panel/@modal/(.)<módulo>/…`, que re-exportan la página completa (recargar o compartir el enlace abre la página completa). `PanelLateral` + `usePanelLateral()`; dentro del panel los formularios cierran con `panel.cerrar(true)` o pasan a otra ruta con `router.replace`. `@modal/[...resto]` cierra el panel al navegar a otra parte.
- **PDF**: `@react-pdf/renderer` en Route Handlers (`…/pdf/route.ts`, `?descargar=1` para bajar). Fuentes TTF en `src/lib/pdf/fuentes` (las `.woff` no sirven) y logo leído de `public/`; ambos van en `outputFileTracingIncludes` de `next.config.ts`. A JetBrains Mono se le desactivan las ligaduras (`fontFeatureSettings`) porque `" //"` rompe fontkit. Los tests de código de servidor van en `*.node.test.tsx` (proyecto `node` de Vitest).
- **Documentos compartidos**: `ficha_json` / `cotizacion_json` / `brief_json` / `acta_json` / `informe_json` (SQL) dan una sola forma para panel (`ficha_panel`), workspace (`ws_ficha`, `ws_cotizacion`) y portal (`portal_documento`); en pantalla se pintan con `src/components/documentos/vista-*.tsx` y en PDF con `src/lib/pdf/*-pdf.tsx` (piezas comunes en `src/lib/pdf/base.tsx`). Enlaces públicos con `obtener_enlace(tipo, id, renovar)`; el portal solo muestra fichas publicadas y cotizaciones que no son borrador.
- **Despliegue**: la app está en Vercel con aguemar.com y despliega sola con cada push a `main`; la base de InsForge es la misma para local y producción, así que una migración aplicada ya está en producción. Las migraciones deben ser compatibles con el código que sigue publicado.
- **Correos**: los avisos se disparan desde las Server Actions con las funciones de `src/lib/correo/avisos.ts` (nunca bloquean ni rompen la acción). Un aviso nuevo va ahí, con la plantilla de `plantilla.ts`.
- Commit al cerrar cada fase.
