# 06 · Accesibilidad (WCAG 2.2 AA)

Fecha: 20/10/2026 · Commit auditado: `f47ac68` (`main`) · **Revisión estática del código; sin pantalla** (dev server apagado, sin axe, sin lector de pantalla ni recorrido real con teclado; ver §6).

## 1. Diagnóstico general

La base es sólida y mejor de lo habitual en un proyecto de diez días: foco visible global con anillo a 6,6:1, `Select` nativo, `Switch` con `role="switch"` y nombre accesible en sus 8 usos, `Campo`/`propsCampo` con `htmlFor`, `aria-invalid`, `aria-describedby` y `role="alert"`, los 41 botones `size="icon"` con `aria-label`, `PageHeader` con `h1` en 51 páginas, skip link en landing, panel y workspace, landmarks con `aria-label` y `aria-current` en toda la navegación. Los tres hallazgos previos (A11Y-01/02/03) están cerrados con evidencia nueva. Lo que queda abierto está en los bordes: contraste de los campos y textos auxiliares de la landing oscura, objetivos táctiles menores de 24 px (cerrar diálogos, calendario), campos obligatorios no anunciados, toasts de error que desaparecen a los 4 s, `role="grid"` sin teclado en el calendario y barras `sticky` sin `scroll-padding`. Nada crítico; dos hallazgos altos de impacto directo en el formulario de captación.

## 2. Fortalezas (con ruta)

- Foco: `:focus-visible` global con `ring-2 ring-ring ring-offset-2` (`src/app/globals.css:123-125`); `--ring` claro `#0a6b3b` = **6,61:1**, oscuro mint sobre ink = **11,68:1** (cálculo propio).
- Controles nativos o con semántica correcta: `<select>` nativo (`src/components/ui/select.tsx:9`), `<button role="switch" aria-checked>` (`src/components/ui/switch.tsx:14-19`) y sus 8 usos con `aria-label`/`aria-labelledby` (p. ej. `src/app/panel/clientes/[id]/modulos.tsx:84`, `src/app/panel/cotizaciones/[id]/pago.tsx:131`).
- Diálogos y paneles con Radix Dialog: foco atrapado, Escape y restauración de foco de serie; los 17 `DialogContent` llevan `DialogTitle` + `DialogDescription`; los 3 `SheetContent` llevan `SheetTitle` (`src/components/panel/topbar.tsx:37`, `src/components/workspace/topbar-workspace.tsx:30`, `src/components/panel/panel-lateral.tsx:60`).
- Formularios: `Campo` (`src/components/formulario/campo.tsx:23-40`) y `propsCampo` (:46-52); `autocomplete` correcto en login (`username`, `current-password`: `src/app/(auth)/login/formulario-login.tsx:27,51`), recuperar (`new-password`, `one-time-code`) e invitación (`new-password`: `src/app/invitacion/[token]/formulario.tsx:45,48`); trampa para bots fuera de pantalla con `aria-hidden` y `tabIndex={-1}` (`src/components/landing/formulario-contacto.tsx:97-100`).
- Nombres e iconos: los 41 `size="icon"` tienen `aria-label` (incluido `ConfirmarEliminar`, `src/components/panel/confirmar-eliminar.tsx:61`); lucide-react 1.55 pone `aria-hidden="true"` por defecto (`node_modules/lucide-react/dist/cjs/lucide-react.js:65`); `Brackets` con `aria-hidden` (`src/components/brand/brackets.tsx:16`); logo con `alt="aguemar"` (`src/components/brand/logo.tsx:21`); QR con `alt` (`src/components/documentos/acciones-documento.tsx:186`).
- Estructura: `h1` por página vía `PageHeader` (`src/components/panel/page-header.tsx:20`, 51 usos), `nav aria-label` + `aria-current="page"` (`src/components/panel/sidebar.tsx:20,45`; `src/components/workspace/nav-workspace.tsx:27,45`), landing con `aria-current="location"` (`src/components/landing/menu-secciones.tsx:41`), secciones `aria-labelledby` y `h2` con nombre real en `sr-only` (`src/components/landing/titulo-sticky.tsx:10-13`), `EmptyState` con `h2`, esqueletos con `role="status" aria-live="polite"` (`src/components/panel/esqueleto.tsx:10`).
- Movimiento: animaciones de la landing solo bajo `prefers-reduced-motion: no-preference` (`globals.css:145`), `Revelar` y `BrilloCursor` comprueban el mismo media query (`revelar.tsx:16`, `brillo-cursor.tsx:14`); nada en bucle.
- PDF: texto vectorial seleccionable con Sora y JetBrains Mono embebidas (`src/lib/pdf/base.tsx:18-32`); colores de texto `mintInk`/`muted` a 6,6:1 y 7,8:1; el mint puro no se usa como texto en los PDF (`rg 'C\.mint\b' src/lib/pdf` → 0).
- Modo oscuro: `color-scheme` declarado (`globals.css:112-117`); todos los pares texto/fondo oscuros ≥ 6,5:1.

## 3. Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| A11Y-01 anillo de foco 1,6:1 | **Cerrado** | `globals.css:44` `--ring: #0a6b3b` → 6,61:1 sobre blanco; oscuro `:70` mint sobre ink 11,68:1 (cálculo propio). En la landing el foco es mint sobre ink: 11,68:1. |
| A11Y-02 borde de campos 1,26:1 | **Cerrado en panel/workspace; Abierto en la landing** | `--input: #767e8f` → 4,08:1 (claro, `globals.css:43`); `#66718a` → 3,92:1 sobre ink, 3,63:1 sobre card (`:69`). El formulario de contacto sobrescribe el borde con `border-white/15` → **1,51:1** (`formulario-contacto.tsx:22`): ver A11Y-001. |
| A11Y-03 skip link solo en la landing | **Cerrado** (con un resto) | `SaltarContenido` en `src/app/panel/layout.tsx:31`, `src/app/w/[slug]/layout.tsx:33`, `privacidad/page.tsx:41`. Falta en el portal `/d/[token]` (tiene `main id="contenido"` en `:161` pero no el enlace); login, invitación y sin-acceso no tienen bloques repetidos, no lo necesitan. |
| "brackets.tsx svg sin aria-hidden" (plan 00, fila 06) | **Cerrado** | `src/components/brand/brackets.tsx:16` lleva `aria-hidden`. |
| "Medido y correcto" de AUDITORIA.md (mint-ink 6,61; muted 7,84; warn 6,49; danger 8,15; botón mint 11,68) | **Confirmado** | Recalculado: 6,61 / 7,84 / 6,49 / 8,15 (danger sobre blanco; sobre danger-soft 6,94) / 11,68. Los comentarios de `globals.css:43-44` ("4,1:1", "6,6:1") son exactos. |

## 4. Hallazgos

| Campo | Contenido |
|---|---|
| ID | A11Y-001 |
| Título | Campos del formulario de contacto sin contraste: borde 1,5:1, placeholder 3,2:1 y ayuda 3,8:1 (1.4.11, 1.4.3) |
| Severidad | Alta |
| Evidencia | `src/components/landing/formulario-contacto.tsx:22` `border-white/15` → **1,51:1** sobre ink (hover `white/30` → 2,65:1), `placeholder:text-white/35` → **3,18:1**; `:83` `[&_p[id$=-ayuda]]:text-white/40` → **3,81:1** en `text-xs`; `:119` `text-white/50` → 5,33:1 (pasa). Cálculo con el script de contraste (blend alfa sobre `#0a0f1a`). |
| Impacto | El único formulario de captación: en pantallas con poco brillo o baja visión no se distinguen los campos ni se lee "uno de los dos" / el placeholder del teléfono. Afecta directamente a leads. |
| Recomendación | Borde `border-white/40` (≥ 3,8:1) o `border-[#6c6f76]`; placeholder y ayuda a `text-white/55` (≥ 6,2:1); mantener `focus-visible:border-mint`. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-002 |
| Título | Campos obligatorios no se anuncian: el `*` lleva `aria-hidden` y el control no recibe `aria-required` (3.3.2) |
| Severidad | Media |
| Evidencia | `src/components/formulario/campo.tsx:26` `<span aria-hidden>*</span>`; `propsCampo` (`:46-52`) no devuelve `aria-required`; `register()` de RHF no añade `required`. Solo login y recuperar usan `required` nativo (`formulario-login.tsx:30,52`). `rg aria-required src` → 0. |
| Impacto | Un usuario de lector de pantalla no sabe qué campos son obligatorios hasta fallar el envío (contacto, invitación, aceptación con DNI, todo el panel). |
| Recomendación | `propsCampo(id, error, ayuda, requerido)` que devuelva `"aria-required": requerido || undefined` y que `Campo` lo pase; o `required` en el control. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-003 |
| Título | Objetivos de 16–18 px: cerrar diálogo/panel, "+" del calendario y pastillas del mes (2.5.8) |
| Severidad | Media |
| Evidencia | `src/components/ui/sheet.tsx:56-57` y `dialog.tsx:28-29`: `<Close>` sin padding con icono `size-4` → **16×16 px**; `src/components/calendario/vistas.tsx:92-97` enlace `p-0.5` + `size-3.5` → **18×18 px**; `:25` pastillas `text-[11px] py-0.5` apiladas con `space-y-0.5` → ≈18 px de alto con 2 px de separación (no cumple la excepción de espaciado de 24 px). Los `size-7` (28 px) y `h-7` del tablero cumplen. |
| Impacto | En móvil (el workspace lo usa la empresa) cerrar el panel lateral o abrir una actividad exige precisión; el panel lateral ocupa toda la pantalla y su única salida es esa X de 16 px. |
| Recomendación | `Close` con `p-2` (32 px) o `size-10`; "+" con `p-1.5`; pastillas con `py-1` y `space-y-1`. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-004 |
| Título | Errores solo en toast de 4 s, sin botón de cierre ni alternativa persistente (2.2.1, 4.1.3) |
| Severidad | Media |
| Evidencia | `src/app/layout.tsx:39` `<Toaster richColors position="top-center" />` sin `duration` ni `closeButton`; sonner 2.0.8 usa 4 000 ms y región `aria-live="polite"`. 43 `toast.error(...)` sin mensaje en línea, p. ej. `src/app/panel/trabajos/tablero.tsx:26`, `src/components/panel/confirmar-eliminar.tsx:50`. |
| Impacto | Un error de guardado desaparece antes de leerse (ampliación, lector de pantalla a velocidad normal, distracción) y no hay forma de recuperarlo; con `polite` tampoco interrumpe. |
| Recomendación | `<Toaster closeButton duration={6000}>` y para errores `toast.error(msg, { duration: Infinity })` o mostrar el error también en línea (`role="alert"`), como ya hace `formulario-contacto.tsx:114`. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-005 |
| Título | Calendario con `role="grid"` sin navegación por teclado ni celdas enfocables (4.1.2, 2.1.1) |
| Severidad | Media |
| Evidencia | `src/components/calendario/vistas.tsx:61-80`: `role="grid"`, `row`, `columnheader`, `gridcell` en `div` sin `tabIndex` ni manejo de flechas (`rg onKeyDown src` → 0). Dentro, los enlaces son `Link` normales (navegables con Tab). |
| Impacto | Un lector de pantalla anuncia una grilla interactiva y espera flechas que no funcionan; el `aria-label` por celda ("Lunes 20 de octubre: 2 eventos") es bueno, pero el patrón prometido no existe. |
| Recomendación | Cambiar a `role="table"`/`row`/`columnheader`/`cell` (semántica sin obligaciones de teclado) o a una `<table>` real; mantener los enlaces. La lista (`ListaAgenda`) ya es correcta. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-006 |
| Título | Barras `sticky` sin `scroll-padding`: el foco puede quedar bajo la topbar o la barra de acciones (2.4.11) |
| Severidad | Media (no verificado en pantalla) |
| Evidencia | Topbar `sticky top-0 h-16` opaca al 80–95 % (`src/components/panel/topbar.tsx:29`, `topbar-workspace.tsx:22`); `BarraAcciones` `sticky bottom-0 bg-background` dentro del panel lateral (`src/components/formulario/barra-acciones.tsx:24`); `formulario-marca.tsx:157`. `rg scroll-padding src` → 0; solo `scroll-mt-20` en anclas puntuales. La landing móvil usa `bg-ink/75` (`titulo-sticky.tsx:9`), semitransparente: cumple el mínimo. |
| Impacto | Al tabular hacia atrás en un formulario largo, el navegador coloca el control en el borde superior, justo bajo los 64 px de la topbar: foco oculto por completo. |
| Recomendación | `html { scroll-padding-top: 4.5rem; }` y `scroll-padding-bottom` en el contenedor del panel lateral (`overflow-y-auto`, `panel-lateral.tsx:58`). Verificar con teclado real. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-007 |
| Título | `/en` conserva `<html lang="es-PE">`: título y metadatos en inglés se leen con voz española (3.1.1) |
| Severidad | Baja |
| Evidencia | `src/app/layout.tsx:35` fijo; `src/components/landing/pagina-landing.tsx:70` pone `lang={t.codigo}` en un `div`. El `<title>` y `<meta description>` quedan fuera de ese `div`. |
| Impacto | Lectores de pantalla anuncian la pestaña y el título en el idioma equivocado; el cuerpo sí se lee bien gracias al `lang` del contenedor y al `lang="es"` de las filas de servicios (`fila.tsx:44`). |
| Recomendación | Mover `/en` a un layout propio con `<html lang="en">` o usar un segmento `[idioma]`; mientras tanto, `document.documentElement.lang = "en"` en un efecto es un parche aceptable. Compartido con SEO (hreflang). |
| Esfuerzo | M |
| Dependencias | 10-SEO (`lang` fijo) |

| Campo | Contenido |
|---|---|
| ID | A11Y-008 |
| Título | Textos atenuados por debajo de 4,5:1: días de otro mes y pie de la landing (1.4.3) |
| Severidad | Baja |
| Evidencia | `vistas.tsx:86` `text-muted-foreground/60` → **2,93:1** claro / 3,42:1 oscuro; `pagina-landing.tsx:127,205` y `fila.tsx:45` `text-white/45` → 4,51:1 (al límite, pasa). Resto de tokens ≥ 6:1 (tabla de cálculo en §6). |
| Impacto | Menor: los días fuera del mes son contexto, pero siguen siendo contenido. |
| Recomendación | `text-muted-foreground/80` (≈ 4,9:1) para los días fuera de mes. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | A11Y-009 |
| Título | Portal `/d/[token]` sin "Saltar al contenido"; tablas sin `scope` ni `caption`; animaciones de diálogos sin `reduced-motion` (2.4.1, 1.3.1, 2.3.3) |
| Severidad | Baja |
| Evidencia | `src/app/d/[token]/page.tsx:151-163` (cabecera + `main id="contenido"` sin `SaltarContenido`); `src/components/ui/table.tsx:32` `<th>` sin `scope`, `rg '<caption|scope=' src` → 0; `sheet.tsx:30`, `dialog.tsx:22`, `dropdown-menu.tsx:24` usan `animate-in/slide/zoom` de tw-animate-css, que no respeta `prefers-reduced-motion` (`rg prefers-reduced-motion node_modules/tw-animate-css/dist/tw-animate.css` → 0). 2.3.3 es AAA: se documenta, no bloquea. |
| Impacto | Bajo; las tablas son simples (encabezados en `thead` se infieren) y el portal tiene poca navegación. |
| Recomendación | Añadir `SaltarContenido` en `Marco`; `scope="col"` por defecto en `TableHead`; `motion-reduce:animate-none` en los contenidos de Radix. |
| Esfuerzo | S |
| Dependencias | — |

## 5. Tabla de contraste calculada (resumen)

Claro: foreground 19,2 · muted 7,84 · mint-ink 6,61 · mint-ink/mint-soft 6,04 · warn/warn-soft 6,49 · danger/danger-soft 6,94 · ink/mint 11,68 · `--input` 4,08 · `--border` 1,26 (decorativo, no de control) · `--ring` 6,61 · sidebar-fg/50 4,58. Oscuro: foreground 15,8 · muted 7,55 (6,99 sobre card) · mint/ink 11,68 · success 7,65 · warning 8,41 · red-200/danger 11,9 · `--input` 3,92 (3,63 sobre card) · `--ring` 11,68. Landing: white/65 8,33 · /60 7,23 · /55 6,23 · /50 5,33 · /45 4,51 · **/40 3,81** · **/35 3,18** · **borde /15 1,51** · chip mint 9,8. PDF: muted 7,84 · mint-ink 6,61 · line 1,26 (solo separadores).

## 6. No verificado en pantalla y preguntas abiertas

**No verificado (requiere dev server o build servido):** axe/Lighthouse en `/`, `/en`, `/login`, `/panel`, `/w/[slug]`, `/d/[token]`; recorrido con teclado real (orden de tabulación con rutas interceptadas `@modal`, restauración de foco tras `router.back()` en `panel-lateral.tsx:45`, foco bajo barras sticky —A11Y-006—); lectura con NVDA/VoiceOver (anuncio de toasts sonner, `role="grid"`, `aria-current`, nombre del `Sheet` con título `sr-only`); zoom 200 % y 320 px de ancho (reflow 1.4.10) en tablero (`min-w-[1100px]`, `tablero.tsx:31`, con scroll horizontal: aceptable como contenido bidimensional) y tablas; contraste real de `richColors` de sonner; comportamiento de `prefers-reduced-motion` y `prefers-color-scheme`; tamaño efectivo de los objetivos (A11Y-003) con DevTools.

**Preguntas abiertas:** (1) ¿La sesión de InsForge expira sin aviso mientras se edita un formulario largo? (`updateSession` en middleware; no hay aviso previo: 2.2.1 queda sin evaluar). (2) ¿Se quiere accesibilidad del PDF (PDF/UA, etiquetas, `alt` del QR)? Hoy es texto vectorial con fuentes embebidas, sin estructura etiquetada; no se exige para AA web. (3) ¿Hay usuarios con lector de pantalla entre las empresas? Define si A11Y-005 y A11Y-007 suben de prioridad.
