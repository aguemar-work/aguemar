# agueMar Studio — guía para Claude Code

## Rol

Eres un ingeniero full-stack senior y diseñador de producto. Construyes **agueMar Studio**, el sistema completo de la marca personal de soporte técnico de Alejandro Guevara Martínez (marca: agueMar), con sede en Perú. El sistema une una landing page pública, un panel privado para gestionar clientes, cotizaciones y fichas técnicas, y un portal donde el cliente ve y acepta sus documentos.

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

Logo: `LOGO.svg` (CorelDRAW, lienzo A4, logo al centro). `public/logo.svg` con viewBox `4470 12270 12720 5835`; `public/logo-light.svg` con `#0A0F1A → #FFFFFF`. Clases CSS internas convertidas a `fill` en línea. Script: `scripts/crop-logo.mjs`.

Rasgo visual: los corchetes `< >` del logo como decoración grande y semitransparente en portadas de documentos y en el hero. Títulos de sección de documentos con numeración mono verde (00, 01, 02…). Tono cercano, directo, español neutro de Perú, tuteando al cliente.

Modo claro y oscuro en el panel. Los PDF son siempre claros.

## Módulos

### 1. Landing pública (`/`)
Hero oscuro con logo, titular, subtítulo y dos CTA: "Pedir cotización" (formulario) y "Escribir por WhatsApp" (wa.me con mensaje). Servicios desde la tabla `servicios` (mantenimiento preventivo, correctivo, soporte remoto, instalación y configuración, redes, recuperación de información; precios "desde" opcionales, `[PENDIENTE: confirmar lista y precios]`). Cómo trabajo (diagnóstico → propuesta → servicio → ficha técnica). Muestra de ficha técnica. Zona de atención `[PENDIENTE]` y FAQ. Formulario de contacto (nombre, teléfono, correo, servicio, mensaje) → tabla `leads`, aviso por correo si hay Resend, honeypot y límite por IP. SEO completo (metadata, OG generada, sitemap, robots, LocalBusiness). Lighthouse ≥ 95 móvil.

### 2. Panel privado (`/panel`, requiere sesión)
- **Inicio**: indicadores del mes, últimas cotizaciones y fichas, mantenimientos próximos a vencer.
- **Clientes**: CRUD (nombre/razón social, RUC 11 dígitos o DNI 8 validados, contacto, teléfono, correo, dirección). Detalle con historial.
- **Equipos**: por cliente; marca, modelo, serie (única por cliente), SO, procesador, RAM, almacenamiento, gráfica, batería, BIOS. Historial de fichas.
- **Servicios**: nombre, descripción, precio base, unidad, visible en landing.
- **Cotizaciones**: numeración `COT-AAAA-NNN` correlativa por año, generada en BD dentro de transacción. Cliente, fecha, validez, asunto, moneda (S/ o US$), ítems (catálogo o libres) con cantidad, precio unitario y descuento, condiciones, estado (Borrador, Enviada, Aceptada, Rechazada, Vencida). IGV configurable (18 %) con "incluido" o "sumar". Cálculo en céntimos enteros, nunca float. Vista previa en vivo del PDF. Acciones: descargar, duplicar, enviar por correo, compartir por WhatsApp, convertir en ficha. Vencida al pasar la validez.
- **Fichas técnicas**: `FT-AAAA-NNN`. Cliente, equipo (elegir o crear), tipo de servicio, modalidad, titular, resumen, estado final (Operativo, Operativo con observaciones, Requiere reparación), indicadores (valor + etiqueta, hasta 4), diagnóstico inicial (elemento, resultado, estado: Óptimo, Mejorable, Atendido, Crítico), trabajos realizados (checklist con plantillas), incidencias (título, causa, solución, estado), recomendaciones, próximo mantenimiento. Plantilla de preventivo: Respaldo, Integridad (DISM, SFC, CHKDSK), Limpieza, Optimización, Aplicaciones, Windows Update, Programas, Antivirus óptimo, Firewall, Eventos del sistema, Idioma y teclado, Soporte del fabricante. "Importar diagnóstico" desde el JSON del script PowerShell.
- **Leads**: bandeja con estado (Nuevo, Contactado, Convertido) y "Crear cotización".
- **Configuración / Mi marca**: nombre comercial, responsable y cargo, RUC, contacto, web, dirección, IGV, moneda y validez por defecto, condiciones por defecto, datos de pago (cuenta, CCI, Yape o Plin) y plantillas de checklist.

### 3. Portal del cliente (`/d/[token]`)
Token largo, no adivinable, revocable. El cliente ve el documento, descarga el PDF y acepta cotizaciones con nombre y DNI (se registran fecha, hora e IP; estado → Aceptada). QR en fichas apuntando al portal. Página noindex.

### 4. Recordatorios
Próximo mantenimiento por ficha (6 meses por defecto). Inicio lista los que vencen en 30 días con botón de recordatorio por WhatsApp o correo.

## Documentos PDF

A4, márgenes laterales 56 px a 96 dpi. Portada oscura (ink) con logo claro a la izquierda; a la derecha en mono: tipo, número y fecha. Rótulo mono verde que empieza con `//`, titular grande blanco, resumen y píldora de estado con punto verde. Corchetes `< >` arriba a la derecha al 12 %. Páginas siguientes: encabezado delgado con logo oscuro y línea mono (tipo, número, modelo, serie), separador 1 px. Pie: "agueMar · soporte técnico" a la izquierda y "NN / TT" a la derecha, mono 11 px. Paginación: filas no se cortan, encabezado de tabla repetido, títulos nunca huérfanos. Cierre: conformidad con dos firmas (responsable con nombre y cargo; cliente "Nombre: ____") y tarjeta oscura de contacto.

Ficha: indicadores → Datos del servicio → Ficha del equipo → Diagnóstico inicial → Trabajos realizados (4 columnas) → Incidencias → Recomendaciones (2 columnas numeradas) → Conformidad → Contacto. Secciones vacías no se muestran.

Cotización: Para / De → Detalle (#, descripción, cantidad, P.U., importe) → Totales a la derecha (subtotal, IGV, total en caja oscura con monto en mint) → Condiciones → Datos de pago → Aceptación → Contacto.

Archivo: `{NUMERO}_{Cliente}.pdf`.

## Modelo de datos (InsForge / Postgres)

Tablas con `id uuid`, `owner_id`, `created_at`, `updated_at`: perfil_marca, clientes, equipos, servicios, cotizaciones, cotizacion_items, fichas, ficha_diagnosticos, ficha_trabajos, ficha_incidencias, ficha_recomendaciones, plantillas_checklist, leads, enlaces_publicos (token, tipo, documento_id, revocado, vistas), aceptaciones, contadores (owner_id, tipo, anio, ultimo).

RLS: `owner_id = auth.uid()`. El portal lee con función `security definer` que valida el token. Numeración con bloqueo de fila. Montos en céntimos enteros. Migraciones versionadas en `migrations/` (`npx -y @insforge/cli db migrations new <nombre>` y `up --all`; sin `BEGIN/COMMIT`, sin bloques `DO` con `EXECUTE`) y seed en `db/seed.sql` (`npm run db:seed -- correo@propietario`) con cliente SGC y ficha FT-2026-001 (Lenovo 83LT, serie PF5Y6DJT, Windows 11 Pro 10.0.26200, BIOS RLCN29WW 14/08/2025, 32 GB RAM, SSD Samsung 1 TB MZAL81T0HFLB, NVIDIA, batería BYD Li-Po 80 000 mWh; SSD 0 % desgaste, batería 99,7 % con 392 ciclos, 0 errores de integridad, 3/3 incidencias: error 0x80073D02 por WhatsApp Beta, imágenes no visibles en Office, Nitro PDF sin aceptar contraseñas por captura de teclado remota).

## Calidad

Responsivo desde 360 px (editor con pestañas en móvil). Accesible (teclado, foco visible, etiquetas, AA). Estados vacíos accionables y errores explicativos. Confirmación visible al guardar y aviso al salir con cambios. Fechas `dd/mm/aaaa`, zona `America/Lima`, montos `es-PE` (S/ 1 234,50). Tests Vitest (IGV, totales, numeración, RUC/DNI) y Playwright (crear cliente, cotización + PDF, aceptar desde portal, crear ficha). Sin secretos en el repo. README completo.

## Fases

1. Base: proyecto, tokens, logos, layout del panel, auth y migraciones con RLS.
2. Clientes, equipos, servicios y Mi marca.
3. Cotizaciones con vista previa, PDF, numeración y estados.
4. Fichas técnicas con plantillas, PDF y vínculo con equipos.
5. Importar diagnóstico (`diagnostico-agueMar.ps1` → JSON).
6. Portal del cliente: tokens, aceptación y QR.
7. Landing pública, formulario de contacto y leads.
8. Recordatorios, correo, pulido, tests completos y Vercel.

## Convenciones del repo

- Código y comentarios en español; identificadores en español salvo APIs externas.
- Backend en InsForge (sin Docker local). Esquema y RLS solo por migraciones; `db query` solo para datos. Las funciones `security definer` fijan `search_path = pg_catalog, public, pg_temp`.
- Auth SSR: `createServerClient` en Server Components, `createAuthActions` en Server Actions (login/logout), `updateSession` en el middleware y `/api/auth/refresh` con `createRefreshAuthRouter`.
- Sin variables de InsForge, la app debe compilar y mostrar un aviso, nunca romper.
- No correr `npm run build` con el dev server activo (comparten `.next`).
- Commit al cerrar cada fase.
