# agueMar Studio — guía para Claude Code

## Rol

Eres un ingeniero full-stack senior y diseñador de producto. Construyes **agueMar Studio**, el centro de control personal (un ERP pequeño) de Alejandro Guevara Martínez (marca: agueMar, Perú), que trabaja en tres áreas: **diseño**, **desarrollo** y **soporte técnico**. El sistema une:

- una **web de dos caras**: portafolio de diseño y desarrollo (`/estudio`) y cara comercial de soporte técnico (`/soporte`), con portada común en `/`;
- un **panel privado** (`/panel`) donde gestiona clientes, catálogo, trabajos (proyectos) por área, cotizaciones, cobros, documentos por área (ficha técnica, brief, acta de entrega), portafolio y recordatorios;
- un **portal del cliente** (`/d/[token]`) donde el cliente ve y acepta sus documentos.

Trabaja por fases. Al terminar cada fase: ejecuta el proyecto, corre los tests, revisa la UI en escritorio y móvil, y resume qué hiciste y qué falta. No avances a la siguiente fase con errores de compilación, de tipos o de lint.

Antes de escribir código de una fase, presenta un plan breve y espera confirmación. Si algún dato del negocio falta, usa los marcadores `[PENDIENTE: …]` en lugar de inventarlo.

## Stack

- Next.js 15 (App Router) + TypeScript estricto.
- Tailwind CSS v4 (tokens en `src/app/globals.css` con `@theme`). Componentes propios; shadcn/ui solo como base adaptada a la marca.
- InsForge (`@insforge/sdk`, entrypoint `@insforge/sdk/ssr`): Postgres, Auth (correo + contraseña; recuperación por código de 6 dígitos en /login/recuperar) y Storage. RLS en todas las tablas. Proyecto `Project_AGUEMAR` vinculado en `.insforge/project.json` (no se commitea).
- PDF con `@react-pdf/renderer`: A4 vectorial, texto seleccionable, fuentes embebidas.
- Zod para validar formularios y entradas de API. React Hook Form para formularios.
- Resend para correos con PDF adjunto (opcional, detrás de variable de entorno).
- Vitest para lógica y Playwright para flujos principales.
- Despliegue en Vercel. `.env.example` con todas las variables.

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

Tipografía: Sora (títulos y cuerpo, 400–700) y JetBrains Mono (números de documento, códigos, series, montos en tablas), con `next/font`.

Logo: `LOGO.svg` (CorelDRAW, lienzo A4, logo al centro). `public/logo.svg` con viewBox `4470 12270 12720 5835`; `public/logo-light.svg` con `#0A0F1A → #FFFFFF`. Clases CSS internas convertidas a `fill` en línea. Script: `scripts/crop-logo.mjs`. Mientras no exista `LOGO.svg`, hay un logo provisional.

Rasgo visual: los corchetes `< >` del logo como decoración grande y semitransparente en portadas de documentos y en los heros. Títulos de sección de documentos con numeración mono verde (00, 01, 02…). Tono cercano, directo, español neutro de Perú, tuteando al cliente.

Modo claro y oscuro en el panel. Los PDF son siempre claros.

## Áreas

Las tres áreas son un enum `area`: `diseno`, `desarrollo`, `soporte`. Cada servicio del catálogo, cada trabajo y cada documento pertenecen a un área. El color de acento es el mismo; el área se distingue con una etiqueta mono (p. ej. `// diseño`).

## Módulos

### 1. Web de dos caras
- `/`: portada con el logo, una frase de posicionamiento y dos puertas: "Estudio: diseño y desarrollo" y "Soporte técnico". Formulario de contacto común al pie (tabla `leads`, con área).
- `/estudio`: portafolio. Casos públicos (de la tabla `portafolio`), proceso de trabajo, servicios de diseño y desarrollo del catálogo, CTA "Conversemos".
- `/soporte`: cara comercial de soporte técnico: hero, servicios del área, "cómo trabajo" (diagnóstico → propuesta → servicio → ficha técnica), muestra de ficha técnica, zona de atención `[PENDIENTE]`, FAQ, CTA de WhatsApp y formulario.
- SEO completo en las tres rutas: metadata, Open Graph generada, sitemap, robots, datos estructurados (Person + LocalBusiness). Lighthouse ≥ 95 móvil. Honeypot y límite por IP en el formulario.

### 2. Panel privado (`/panel`, requiere sesión)
- **Inicio**: ingresos del mes por área (cotizaciones aceptadas y cobros), trabajos activos por estado, cobros pendientes, próximos vencimientos (entregas y mantenimientos), leads nuevos.
- **Clientes**: CRUD (nombre/razón social, RUC 11 dígitos o DNI 8 validados, contacto, teléfono, correo, dirección). Detalle con historial: trabajos, cotizaciones, documentos y equipos.
- **Equipos** (soporte): por cliente; marca, modelo, serie (única por cliente), SO, procesador, RAM, almacenamiento, gráfica, batería, BIOS. Historial de fichas.
- **Servicios**: catálogo con área, nombre, descripción, precio base, unidad, visible en la web.
- **Trabajos**: la unidad central. Área, cliente, título, descripción, estado (`propuesta`, `en_curso`, `en_revision`, `entregado`, `cerrado`, `cancelado`), prioridad, fecha de inicio, fecha comprometida, monto estimado; etapas ordenadas con tareas (hecho/pendiente, fecha), entregables (nombre, enlace, tipo); notas. Vistas: lista filtrable por área y estado, tablero por estado, detalle. Las cotizaciones, cobros y documentos se vinculan al trabajo.
- **Cotizaciones**: numeración `COT-AAAA-NNN` correlativa por año generada en BD. Cliente, trabajo opcional, área, fecha, validez, asunto, moneda (S/ o US$), ítems (catálogo o libres) con cantidad, precio unitario y descuento, condiciones, estado (Borrador, Enviada, Aceptada, Rechazada, Vencida). IGV configurable (18 %) con "incluido" o "sumar". Cálculo en céntimos enteros, nunca float. Vista previa en vivo del PDF. Acciones: descargar, duplicar, enviar por correo, compartir por WhatsApp, crear trabajo o documento al aceptar. Vencida al pasar la validez.
- **Cobros**: pagos registrados contra una cotización o trabajo: fecha, monto, medio (transferencia, Yape, Plin, efectivo, otro), referencia, nota. Saldo pendiente calculado en céntimos.
- **Documentos por área**, todos con numeración propia y la misma plantilla PDF:
  - **Ficha técnica** (`FT-AAAA-NNN`, soporte): cliente, equipo (elegir o crear), tipo de servicio, modalidad, titular, resumen, estado final (Operativo, Operativo con observaciones, Requiere reparación), indicadores (valor + etiqueta, hasta 4), diagnóstico inicial (elemento, resultado, estado: Óptimo, Mejorable, Atendido, Crítico), trabajos realizados (checklist con plantillas por tipo de servicio), incidencias (título, causa, solución, estado), recomendaciones, próximo mantenimiento. "Importar diagnóstico" desde el JSON del script PowerShell `diagnostico-agueMar.ps1`.
  - **Brief** (`BR-AAAA-NNN`, diseño/desarrollo): objetivo, público, alcance, fuera de alcance, referencias, entregables, plazos, supuestos.
  - **Acta de entrega** (`AE-AAAA-NNN`, diseño/desarrollo): entregables con enlaces, accesos entregados, garantía/soporte, pendientes, conformidad del cliente.
- **Portafolio**: casos (título, área, cliente opcional, resumen, descripción, imágenes en Storage, enlace, fecha, publicado). Los publicados salen en `/estudio`.
- **Leads**: bandeja del formulario web con área y estado (Nuevo, Contactado, Convertido) y botón "Crear cotización" que precarga el cliente.
- **Configuración / Mi marca**: nombre comercial, responsable y cargo, RUC, contacto, web, dirección, IGV, moneda y validez por defecto, condiciones por defecto, datos de pago (cuenta, CCI, Yape o Plin) y plantillas de checklist.

### 3. Portal del cliente (`/d/[token]`)
Token largo, no adivinable, revocable, por documento (cotización, ficha, brief, acta). El cliente ve el documento con la marca, descarga el PDF y, en cotizaciones y actas, acepta con nombre y DNI (se registran fecha, hora e IP). QR en los documentos apuntando al portal. Página noindex.

### 4. Agenda y recordatorios
Entregas comprometidas de trabajos, próximos mantenimientos (6 meses por defecto) y seguimientos de cotizaciones enviadas. El inicio lista lo que vence en 30 días con botón de recordatorio por WhatsApp o correo.

## Documentos PDF

A4, márgenes laterales 56 px a 96 dpi. Portada oscura (ink) con logo claro a la izquierda; a la derecha en mono: tipo, número y fecha. Rótulo mono verde que empieza con `//` (incluye el área), titular grande blanco, resumen y píldora de estado con punto verde. Corchetes `< >` arriba a la derecha al 12 %. Páginas siguientes: encabezado delgado con logo oscuro y línea mono (tipo, número y referencia: modelo y serie, o nombre del trabajo), separador 1 px. Pie: "agueMar · <área>" a la izquierda y "NN / TT" a la derecha, mono 11 px. Paginación: filas no se cortan, encabezado de tabla repetido, títulos nunca huérfanos. Cierre: conformidad con dos firmas (responsable con nombre y cargo; cliente "Nombre: ____") y tarjeta oscura de contacto.

Ficha técnica: indicadores → Datos del servicio → Ficha del equipo → Diagnóstico inicial → Trabajos realizados (4 columnas) → Incidencias → Recomendaciones (2 columnas numeradas) → Conformidad → Contacto. Secciones vacías no se muestran.

Cotización: Para / De → Detalle (#, descripción, cantidad, P.U., importe) → Totales a la derecha (subtotal, IGV, total en caja oscura con monto en mint) → Condiciones → Datos de pago → Aceptación → Contacto.

Brief y acta: secciones numeradas con el mismo encabezado, tablas de entregables y bloque de conformidad.

Archivo: `{NUMERO}_{Cliente}.pdf`.

## Modelo de datos (InsForge / Postgres)

Tablas con `id uuid`, `owner_id`, `created_at`, `updated_at`: perfil_marca, clientes, equipos, servicios (con `area`), trabajos, trabajo_etapas, trabajo_tareas, trabajo_entregables, cotizaciones (con `area` y `trabajo_id`), cotizacion_items, cobros, fichas, ficha_diagnosticos, ficha_trabajos, ficha_incidencias, ficha_recomendaciones, briefs, actas_entrega, portafolio, plantillas_checklist, leads (con `area`), enlaces_publicos (token, tipo, documento_id, revocado, vistas), aceptaciones, contadores (owner_id, tipo, anio, ultimo).

RLS: `owner_id = auth.uid()`. El portal lee con función `security definer` que valida el token. Numeración con bloqueo de fila (tipos `COT`, `FT`, `BR`, `AE`). Montos en céntimos enteros. Migraciones versionadas en `migrations/` (`npx -y @insforge/cli db migrations new <nombre>` y `up --all`; sin `BEGIN/COMMIT`, sin bloques `DO` con `EXECUTE`) y seed en `db/seed.sql` (`npm run db:seed -- correo@propietario`) con cliente SGC y ficha FT-2026-001 (Lenovo 83LT, serie PF5Y6DJT, Windows 11 Pro 10.0.26200, BIOS RLCN29WW 14/08/2025, 32 GB RAM, SSD Samsung 1 TB MZAL81T0HFLB, NVIDIA, batería BYD Li-Po 80 000 mWh; SSD 0 % desgaste, batería 99,7 % con 392 ciclos, 0 errores de integridad, 3/3 incidencias: error 0x80073D02 por WhatsApp Beta, imágenes no visibles en Office, Nitro PDF sin aceptar contraseñas por captura de teclado remota).

## Calidad

Responsivo desde 360 px (editores con pestañas en móvil). Accesible (teclado, foco visible, etiquetas, AA). Estados vacíos accionables y errores explicativos. Confirmación visible al guardar y aviso al salir con cambios. Fechas `dd/mm/aaaa`, zona `America/Lima`, montos `es-PE` (S/ 1 234,50). Tests Vitest (IGV, totales, saldos, numeración, RUC/DNI) y Playwright (crear cliente, crear trabajo, cotización + PDF, aceptar desde portal, crear ficha). Sin secretos en el repo. README completo.

## Fases

1. ✅ Base: proyecto, tokens, logos, layout del panel, auth y migraciones con RLS.
2. ✅ Clientes, equipos, servicios y Mi marca (pendiente: campo `area` en servicios, se agrega en la Fase 3).
3. Trabajos: área en servicios, tablas de trabajos/etapas/tareas/entregables, lista, tablero y detalle; inicio con trabajos activos.
4. Cotizaciones multi-área con vista previa, PDF, numeración y estados; cobros y saldos.
5. Documentos por área: ficha técnica (plantillas de checklist, PDF, equipos, `diagnostico-agueMar.ps1`), brief y acta de entrega.
6. Portal del cliente (tokens, aceptación, QR) y portafolio (Storage).
7. Web de dos caras (`/`, `/estudio`, `/soporte`), formulario y bandeja de leads.
8. Agenda y recordatorios, correo, pulido final, tests completos y despliegue en Vercel.

## Convenciones del repo

- Código y comentarios en español; identificadores en español salvo APIs externas.
- Backend en InsForge (sin Docker local). Esquema y RLS solo por migraciones; `db query` solo para datos. Las funciones `security definer` fijan `search_path = pg_catalog, public, pg_temp`.
- Auth SSR: `createServerClient` en Server Components, `createAuthActions` en Server Actions (login/logout), `updateSession` en el middleware y `/api/auth/refresh` con `createRefreshAuthRouter`.
- Acceso a datos en `src/lib/datos/*` (consultas con sesión, RLS aplica) y Server Actions por módulo en `src/app/panel/<modulo>/acciones.ts` que devuelven `Resultado<T>`; errores de Postgres traducidos en `src/lib/insforge/errores.ts`.
- Formularios: React Hook Form + Zod (`src/lib/validators/*`), componentes `Campo`/`propsCampo`, `BarraAcciones`, `useAvisoCambios`.
- Sin variables de InsForge, la app debe compilar y mostrar un aviso, nunca romper.
- **El servidor de desarrollo lo arranca y detiene el usuario en su máquina** (`npm run dev` en su terminal). Claude no lo inicia, reinicia ni detiene, ni usa el preview integrado para levantarlo; verifica contra http://localhost:3000 cuando el usuario lo tenga corriendo. Tampoco correr `npm run build` mientras ese servidor esté activo (comparten `.next`): avisar y pedirle que lo detenga antes.
- Commit al cerrar cada fase.
