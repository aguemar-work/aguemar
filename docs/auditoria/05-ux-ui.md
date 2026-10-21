# 05 · UX / UI

Fecha: 20/10/2026 · Commit auditado: `f47ac68` · **Revisión estática** (código y CSS; dev server apagado, sin pantalla). **PDF generados por tests** con `GUARDAR_PDF=<scratchpad> npx vitest run tests/unit/pdf-*` (4 archivos, 8 tests en verde) y revisados como imagen y como texto extraído.

## 1. Diagnóstico general

El producto tiene un sistema de diseño pequeño pero coherente (tokens en `globals.css`, 14 componentes base, etiquetas de estado legibles, iconografía lucide a 16 px) y patrones de interacción uniformes en los 10 formularios del panel (RHF + Zod, `Campo`, `BarraAcciones`, `useAvisoCambios`, panel lateral). Los flujos clave (login por rol, invitación, cotización → aceptación → trabajo, ficha con diagnóstico importado, bandeja) están completos y dan feedback (toasts con acción, diálogos de "mensaje para WhatsApp" tras publicar o enviar). Los PDF son sobrios y legibles; la ficha cabe en una hoja con QR. Lo que resta valor está en los bordes: marcadores `[PENDIENTE…]` que pueden llegar a un cliente, 404 que expulsa del marco, confirmaciones nativas mezcladas con diálogos de marca, tarjetas del inicio que aterrizan en listas sin filtrar, kanban y formulario de cotización pesados en 360 px, y una posible pérdida de ligaduras "fi" en el texto seleccionable de los PDF. Nada es crítico; el bloque de "callejones sin salida" y de microcopy es barato de cerrar.

## 2. Fortalezas

- **Tokens y modo oscuro:** paleta de marca y semánticos claro/oscuro en un solo lugar (`src/app/globals.css:7-106`), con contraste anotado para borde de campo y anillo de foco (`:43-44`). Casi no hay valores mágicos en TSX: solo el color del `Brackets` (`src/app/(auth)/login/page.tsx:25`, `src/app/invitacion/[token]/page.tsx:30`) y la OG image.
- **Componentes:** `Button` con 7 variantes y 4 tamaños (`src/components/ui/button.tsx:10-24`); `Badge` semántico ok/warn/danger/mono (`badge.tsx:9-20`); `Select`/`Switch` propios, nativos y accesibles (`select.tsx:5-24`, `switch.tsx:14-35`); tabla con `overflow-x-auto` (`table.tsx:6`) y columnas que se ocultan por breakpoint (30 usos de `hidden md:table-cell`).
- **Estados legibles:** `propuesta`→"Propuesta", `en_curso`→"En curso", `en_revision`→"En revisión" (`src/lib/areas.ts:17-23`); cotización y ficha (`src/components/panel/etiquetas.tsx:4-16`); solicitudes (`src/app/panel/bandeja/solicitud.tsx:19-24`).
- **Formularios:** los 10 `formulario-*.tsx` del panel usan `useAvisoCambios(formState.isDirty && !isSubmitSuccessful)` (grep, 10/10) y `BarraAcciones` con estado "Guardando…" y error `role=alert` (`src/components/formulario/barra-acciones.tsx:27-44`); dentro del panel lateral la barra es sticky y "Cancelar" cierra el panel (`:24,31-33`); el panel pregunta antes de cerrar con cambios (`src/components/panel/panel-lateral.tsx:41`).
- **Carga, vacío, error:** 11 `loading.tsx` con esqueletos `role=status` (`src/components/panel/esqueleto.tsx:8-15`); `EmptyState` con copy accionable en 33 usos ("Aún no hay cotizaciones. Crea la primera…", `src/app/panel/cotizaciones/page.tsx:75-78`); `error.tsx` por segmento con reintento y `digest` (`src/app/panel/error.tsx:12-35`, `src/app/w/[slug]/error.tsx:10-34`); `global-error.tsx:7-25`; aviso claro sin InsForge (`src/components/panel/aviso-backend.tsx:12-16`).
- **Feedback en flujos:** aceptar en el panel → toast con acción "Ver trabajo" (`src/app/panel/cotizaciones/[id]/acciones-cotizacion.tsx:141-143`); enviar → abre el mensaje de WhatsApp con enlace a workspace o portal (`:38-45, 237-241`); publicar documento → mismo patrón (`src/components/documentos/acciones-documento.tsx:44-51`); importador de diagnóstico con vista previa, avisos y "qué aplicar" (`src/app/panel/fichas/importar-diagnostico.tsx:100-156`); invitación con estados usada/vencida/revocada y "entraste con otro correo" (`src/app/invitacion/[token]/page.tsx:17-21, 55-71`).
- **Inicio del panel:** 6 alertas con tono por severidad, "Todo al día" cuando no hay nada (`src/app/panel/page.tsx:41-57, 96-100`), "Sin movimiento", "Te deben" con atraso en días (`:278-307`).
- **Landing:** CTA "Cuéntame tu proyecto" → `#contacto`, donde WhatsApp y correo van antes que el formulario (`src/components/landing/pagina-landing.tsx:97-101, 171-197`); formulario de 3 campos con éxito claro y plan B por WhatsApp si no hay canal (`src/components/landing/formulario-contacto.tsx:60-79, 101-112`); selector ES/EN con `aria-current` y `hrefLang` (`selector-idioma.tsx:14-23`); animaciones solo con `prefers-reduced-motion: no-preference` y red de seguridad a 2,5 s (`globals.css:145-180`).
- **PDF (vistos):** cabecera clara, rótulo `// área`, píldora de estado, numeración mono verde, tablas con línea bajo el encabezado, totales alineados a la derecha (cotizacion.pdf); la ficha completa cabe en una hoja con indicadores, diagnóstico, checklist en 4 columnas, incidencias y QR junto a las firmas (ficha.pdf).

## 3. Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| UX-01 · Un solo límite de error global | **Cerrado** | `src/app/panel/error.tsx:12-35` y `src/app/w/[slug]/error.tsx:10-34` son `error.tsx` de segmento (se renderizan dentro de sus layouts, así que conservan barra lateral y cabecera); `src/app/global-error.tsx:7-25` cubre el layout raíz; `src/app/error.tsx` queda para login, invitación, `/d`, `/sin-acceso`. El slot `@modal` comparte el `error.tsx` del panel (`src/app/panel/layout.tsx:50`). Comportamiento real no verificado en pantalla. |
| UX-02 · Contraseña inicial inventada por el propietario | **Cerrado** | El acceso de empresa se da por invitación: el propietario solo escribe el correo ("Le llega un enlace para crear su contraseña. Vence en 7 días", `src/app/panel/clientes/[id]/acceso.tsx:33-53, 93`); la persona fija su contraseña en `src/app/invitacion/[token]/formulario.tsx:44-49` (`autoComplete="new-password"`, mínimo 8). Residuo: `/login/recuperar` conserva la ruta "Ya tengo un código… el que le envió el propietario" (`src/app/(auth)/acciones.ts:126-136`), hoy un camino secundario. |

## 4. Hallazgos

| Campo | Contenido |
|---|---|
| ID | UX-001 |
| Título | Marcadores `[PENDIENTE…]` pueden llegar al cliente (PDF, `/privacidad`, servicios) |
| Severidad | Media |
| Evidencia | `src/lib/pdf/base.tsx:186` imprime `[PENDIENTE: contacto en Mi marca]` cuando la marca no tiene teléfono/correo/web: se ve en brief.pdf, acta.pdf e informe.pdf generados (y la firma sale "aguemar / aguemar" si falta `responsable`); `src/app/privacidad/page.tsx:34-37` publica `[PENDIENTE: RUC]`, `[PENDIENTE: dirección]`… si el campo está vacío; `src/app/panel/servicios/lista-servicios.tsx:104` muestra "[PENDIENTE]" en vez de "Sin precio"; `src/lib/validators/marca.ts:18,22` aceptan valores que empiezan por `[PENDIENTE`. |
| Impacto | Un documento firmado o la página legal pública con texto de desarrollo resta credibilidad; un brief/acta sin contacto no tiene cómo responderse. |
| Recomendación | En PDF y privacidad, omitir la línea cuando falte el dato y, en el panel, un aviso persistente "Completa Mi marca (contacto, responsable, dirección) antes de publicar documentos" en Inicio y en `AccionesDocumento`; rechazar `[PENDIENTE` en los validadores; "Sin precio" en servicios. |
| Esfuerzo | S |
| Dependencias | COD (validators), SEO/LEG (`/privacidad`) |

| Campo | Contenido |
|---|---|
| ID | UX-002 |
| Título | 404 único que expulsa del marco del panel y del workspace |
| Severidad | Media |
| Evidencia | 33 `notFound()` en páginas del panel y del workspace (p. ej. `src/app/panel/trabajos/[id]/detalle.tsx:39`, `src/app/w/[slug]/proyectos/page.tsx:20` para módulo inactivo) y un solo `src/app/not-found.tsx` (raíz) que ofrece "Ir a mi espacio" (→ `/login`, que redirige por sesión, `src/lib/insforge/middleware.ts:6`) e "Ir al inicio" (→ landing). |
| Impacto | Un enlace a un trabajo borrado o a un módulo que Alejandro desactivó saca al usuario de su contexto, sin barra lateral ni vuelta a la lista; la empresa no entiende que "el módulo no está activo". Dentro del panel lateral (`@modal`) el resultado no se pudo verificar. |
| Recomendación | `not-found.tsx` en `src/app/panel/` y `src/app/w/[slug]/` que conserven el marco y enlacen a la lista del módulo; en el workspace, texto específico para módulo inactivo ("Este módulo no está activo para tu empresa; escríbenos si lo necesitas"). |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | UX-003 |
| Título | Confirmaciones mezcladas: diálogo de marca en unas acciones, `window.confirm` en otras |
| Severidad | Media |
| Evidencia | `ConfirmarEliminar` (Dialog accesible, `src/components/panel/confirmar-eliminar.tsx:59-83`) convive con 9 `window.confirm`: `src/app/panel/bandeja/solicitud.tsx:98`, `leads/tarjeta-lead.tsx:45`, `cotizaciones/cobros.tsx:150`, `trabajos/[id]/plan.tsx:238`, `fichas/formulario-ficha.tsx:380`, `informes/formulario-informe.tsx:85`, `src/components/documentos/acciones-documento.tsx:151,159`, `src/components/panel/panel-lateral.tsx:41`. Borrar solicitud es un botón solo-icono ghost (`solicitud.tsx:92-106`). |
| Impacto | El diálogo nativo no lleva la marca, no se puede estilizar ni probar con Playwright de forma uniforme, y en móvil bloquea la pestaña; destruir cobros o solicitudes merece el mismo cuidado que borrar una cotización. |
| Recomendación | Un `useConfirmar()` sobre `Dialog` (título, descripción, botón danger) y migrar los 9 usos; el cierre del panel lateral con cambios puede seguir en `confirm` nativo si se acepta la excepción. |
| Esfuerzo | S |
| Dependencias | A11Y |

| Campo | Contenido |
|---|---|
| ID | UX-004 |
| Título | Las alertas del inicio aterrizan en listas sin el filtro que prometen |
| Severidad | Media |
| Evidencia | "Entregas vencidas", "Entregan esta semana" y "Tareas vencidas" enlazan a `/panel/trabajos` sin parámetros (`src/app/panel/page.tsx:42-44`); la lista solo filtra por `q/area/estado/cliente/vista` (`src/app/panel/trabajos/page.tsx:23`). Solo "Por cobrar" filtra (`:52`). |
| Impacto | El dashboard dice "3 entregas vencidas" y el clic muestra todos los trabajos: el usuario vuelve a buscar lo que ya le habían señalado. Rompe la promesa "solo lo que pide atención". |
| Recomendación | Filtros `?vencidas=1`, `?semana=1`, `?tareas_vencidas=1` (o un `?foco=` único) en la lista de trabajos, con chip "Filtro: entregas vencidas × quitar". |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | UX-005 |
| Título | Bandeja: "Responder" no es en línea y no hay vía de duda/rechazo para la empresa en cotizaciones |
| Severidad | Media |
| Evidencia | En la bandeja, "Responder" un comentario navega al detalle (`/panel/trabajos/[id]#comentarios`, `src/app/panel/bandeja/page.tsx:91-103`) aunque CLAUDE.md la describe como "responder en línea"; en el workspace, la cotización solo ofrece aceptar con nombre y DNI (`src/app/w/[slug]/cotizaciones/[id]/page.tsx:56`), sin comentar ni rechazar, y `Hilo` solo existe para trabajo/actividad/informe (`src/app/panel/bandeja/page.tsx:73-87`). El botón de aceptar queda deshabilitado hasta marcar la casilla sin explicarlo (`src/components/documentos/aceptar-documento.tsx:86`). |
| Impacto | Tres pasos extra por cada respuesta del propietario; la empresa que tiene una duda sobre el precio no tiene dónde escribirla y la cotización queda "sin respuesta" hasta vencer. |
| Recomendación | Caja de respuesta en línea en la tarjeta de la bandeja (misma Server Action del hilo); bajo el bloque "Aceptar esta cotización", enlace "Tengo una duda" (WhatsApp/correo del estudio desde Mi marca) o hilo de comentarios de cotización; texto de ayuda "Marca la conformidad para habilitar el botón". |
| Esfuerzo | M |
| Dependencias | PRO (comentarios en cotización) |

| Campo | Contenido |
|---|---|
| ID | UX-006 |
| Título | Posible pérdida de la ligadura "fi" en el texto seleccionable de los PDF |
| Severidad | Media |
| Evidencia | El texto extraído de los PDF generados lee "Gráfca", "Microsoft Ofce", "verifcó" (ficha.pdf), "Con la frma" (acta.pdf), "planifcadas" (informe.pdf); la imagen renderizada es correcta. Las ligaduras se desactivan solo para JetBrains Mono (`src/lib/pdf/base.tsx:83-90`), no para Sora (`:18-33`). |
| Impacto | CLAUDE.md exige "texto seleccionable": copiar/pegar, buscar "Office" en el visor o leer con lector de pantalla fallan en cada palabra con "fi". Riesgo de que el extractor sea el culpable: confirmar copiando desde un visor. |
| Recomendación | `fontFeatureSettings: { liga: false }` en el estilo base de Sora (o registrar la fuente sin GSUB de ligaduras) y un test que genere un PDF con "Office / firma" y compruebe el texto extraído con `pdf-parse`. |
| Esfuerzo | S |
| Dependencias | QA |

| Campo | Contenido |
|---|---|
| ID | UX-007 |
| Título | Kanban y formulario de cotización pesados en 360 px |
| Severidad | Baja |
| Evidencia | Tablero con `min-w-[1100px]` y 5 columnas (`src/app/panel/trabajos/tablero.tsx:31`), mover tarjetas con botones `h-7` (28 px, `:64-69`); el formulario de cotización apila por línea descripción + 4 campos + importe (`src/app/panel/cotizaciones/formulario-cotizacion.tsx:219-239`) y los totales van al final (`:244-272`), en un panel lateral `w-full` en móvil (`panel-lateral.tsx:58`). Calendario sí cambia a lista en móvil (`src/app/panel/calendario/page.tsx:105-110`). |
| Impacto | En celular, el tablero exige scroll horizontal largo y objetivos táctiles por debajo de 44 px; una cotización de 5 líneas son ~30 campos antes de ver el total. |
| Recomendación | En `< md`, tablero como pestañas por columna (o acordeón) y botones de mover a `h-9`; en el formulario, total vivo pegado a `BarraAcciones` (ya sticky) y líneas colapsables mostrando solo título e importe. |
| Esfuerzo | M |
| Dependencias | A11Y (tamaño de objetivo) |

| Campo | Contenido |
|---|---|
| ID | UX-008 |
| Título | Microcopy: "cliente" vs "empresa", pie "soporte técnico" y callejones sin contacto |
| Severidad | Baja |
| Evidencia | "Este cliente ya tiene…", "Ya existe un cliente…" (`src/lib/insforge/errores.ts:23,25`); "Primero necesitas un cliente." (`src/app/panel/equipos/nuevo/page.tsx:22-23`); columna "Cliente" y "Sin cliente" (`src/app/panel/trabajos/page.tsx:90,108`; `tablero.tsx:51`). Pie de login y sidebar "aguemar · soporte técnico" (`src/app/(auth)/login/page.tsx:34`, `src/components/panel/sidebar.tsx:64`) para una marca de tres áreas. `/sin-acceso` dice "Escríbenos" sin enlace (`src/app/sin-acceso/page.tsx:21-22`); invitación vencida dice "Pide a aguemar un enlace nuevo" sin cómo (`src/app/invitacion/[token]/page.tsx:18-20`). |
| Impacto | Inconsistencia con la convención del repo (en la UI el cliente es "empresa"); quien queda sin acceso no sabe a quién escribir. |
| Recomendación | Unificar "empresa"; pie "aguemar · diseño, desarrollo y soporte"; en `/sin-acceso` e invitación no vigente, WhatsApp/correo desde `perfil_marca` (`landing_datos()`). |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | UX-009 |
| Título | Mensajes de error crudos en la interfaz |
| Severidad | Baja |
| Evidencia | `traducirError` termina en ``No se pudo completar: ${e.message}`` (`src/lib/insforge/errores.ts:84`); login y recuperación concatenan `error.message` de InsForge (`src/app/(auth)/acciones.ts:56,115,197`). |
| Impacto | El usuario ve inglés técnico de PostgREST/Auth sin saber qué hacer. |
| Recomendación | Mensaje genérico en español + código corto (o `digest`) y el detalle a Sentry; ampliar el mapa `UNICOS` con las restricciones que falten. |
| Esfuerzo | S |
| Dependencias | COD-02 (`traducirError`) |

| Campo | Contenido |
|---|---|
| ID | UX-010 |
| Título | Modo oscuro: `danger` sin token semántico y tema del sistema en páginas públicas |
| Severidad | Baja |
| Evidencia | Overrides ad hoc `dark:text-red-300` / `dark:text-red-200` / `dark:bg-danger/20` en 8 archivos (`src/app/panel/page.tsx:27,295,404`, `clientes/[id]/page.tsx:364`, `w/[slug]/cotizaciones/page.tsx:35,58`, `cotizaciones/[id]/pago.tsx:19`, `inicio-equipo.tsx:121`, `src/components/ui/badge.tsx:17`) mientras warning sí tiene tokens oscuros (`globals.css:75-76`). El portal `/d/[token]` y `/privacidad` siguen el tema del sistema (`src/app/layout.tsx:37`; `src/app/d/[token]/page.tsx:153-157`) sin conmutador; la landing fuerza oscuro (`pagina-landing.tsx:70`). |
| Impacto | Riesgo de contraste distinto por pantalla en los estados de peligro; un cliente que abre el portal desde un celular en modo oscuro ve el documento oscuro y el PDF claro. No verificado en pantalla. |
| Recomendación | `--danger-foreground/--danger-bg` claro y oscuro en `globals.css` y variante `danger` de `Badge`/alertas sobre ellos; decidir si el portal va siempre claro (como los PDF) y fijarlo con `data-theme`. |
| Esfuerzo | S |
| Dependencias | A11Y (contraste) |

| Campo | Contenido |
|---|---|
| ID | UX-011 |
| Título | Segmentos sin `loading.tsx` y esqueleto genérico en subrutas |
| Severidad | Baja |
| Evidencia | `d/[token]` e `invitacion/[token]` son `force-dynamic` y consultan la base (`page.tsx:17,33`; `:10,25`) sin `loading.tsx`; `login` y `sin-acceso` tampoco. Las subrutas de `/panel` y `/w/[slug]` heredan `EsqueletoPagina` (6 tarjetas + lista, `src/app/panel/loading.tsx`, `src/app/w/[slug]/loading.tsx`) aunque la página sea un detalle o un formulario; solo los 9 modales tienen esqueleto propio. |
| Impacto | Pestaña en blanco 0,4–0,6 s+ (latencia us-east) al abrir un enlace de documento o invitación desde WhatsApp; salto de layout cuando el esqueleto no se parece a la página. |
| Recomendación | `loading.tsx` mínimo (logo + bloque) en `d/[token]` e `invitacion/[token]`; `loading.tsx` por módulo en `panel/<módulo>/[id]` reutilizando `EsqueletoDetalle` / `EsqueletoFormulario`. |
| Esfuerzo | S |
| Dependencias | PER |

## 5. No verificado en pantalla

- Responsive real a 360 px (panel lateral `w-full`, tablas con `overflow-x-auto`, menú móvil `w-72`, kanban), comportamiento de `notFound()` dentro del slot `@modal`, y el "salto" de los esqueletos.
- Modo oscuro real (tokens `.dark`, overrides `dark:text-red-*`, portal `/d` en sistema oscuro) y contraste efectivo.
- Animaciones de la landing (`.entrada`, `[data-revelar]`, `BrilloCursor`), menú sticky con `aria-current`, atenuado de `Fila` en hover.
- Toasts (`sonner`, `top-center`) sobre el panel lateral abierto; foco al abrir/cerrar Sheet y Dialog.
- PDF: solo los 5 de los tests, con fixtures; la ligadura "fi" (UX-006) se infiere del texto extraído y debe confirmarse copiando desde un visor. Cotizaciones multipágina, informes largos y marca real no se generaron.

## 6. Preguntas abiertas

1. ¿Mi marca en producción tiene responsable, teléfono/correo y dirección? Define si UX-001 ya ocurre en documentos reales o solo es riesgo.
2. ¿El portal `/d/[token]` debe ser siempre claro (como los PDF) o seguir el sistema del visitante?
3. ¿Las empresas han pedido rechazar o comentar una cotización desde su espacio (UX-005), o basta con WhatsApp?
4. ¿Se usa el tablero desde el celular? Si no, UX-007 baja a "aceptable con scroll".
5. ¿Queda alguien usando el camino "Ya tengo un código" de `/login/recuperar`? Si no, retirarlo simplifica la pantalla.
