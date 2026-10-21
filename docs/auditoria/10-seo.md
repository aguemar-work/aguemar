# 10 · SEO

Fecha: 20/10/2026 · Commit: `f47ac68` · Revisión estática sobre el build en `.next-verify` (dev server apagado; sin Lighthouse ni rastreo real). Perfil: Especialista SEO del comité externo.

## Diagnóstico general

El SEO técnico de base está bien hecho y lo confirma el HTML real del build: título y descripción únicos por idioma, canónica, `hreflang` es-PE/en/x-default, Open Graph y Twitter Card en `/`, `robots.txt` y `sitemap.xml` coherentes con `https://aguemar.com`, `noindex` en todo lo privado, 404 con estatus 404 real, un solo `h1` y `h2` con nombre real en `sr-only`, JSON-LD sintácticamente válido y escapado. Lo que falta es de **alcance y de intención**: hay tres URL indexables y una sola comercial, centrada en la persona y sin ciudad ni términos con los que una empresa busca ("soporte técnico para empresas Lima", "desarrollo web Perú": 0 coincidencias de "Lima" y "diseño web" en `index.html`). El JSON-LD no cualifica para resultados enriquecidos (sin `address`, `image`, `telephone`) y revela datos que la página no muestra por diseño. `/en` se comparte **sin imagen** en redes. Nada de esto es crítico; SEO-002 y SEO-003 son los que mueven captación, el objetivo a 3 meses.

## Fortalezas

- Metadatos por idioma con `title.absolute`, canónica y `alternates.languages` (`src/lib/landing-meta.ts:8-13`); en el build: `<link rel="canonical" href="https://aguemar.com">` + tres `hreflang` en `index.html` y `en.html`.
- `robots.txt.body`: `Allow: /`, `Disallow` de `/panel`, `/w/`, `/d/`, `/login`, `/sin-acceso`, `/invitacion/`, `/api/` y `Sitemap:` absoluto (`src/app/robots.ts:7-8`). `/en` y `/privacidad` permitidos.
- `sitemap.xml.body` con `/`, `/en`, `/privacidad` y `xhtml:link hreflang` en las dos landings (`src/app/sitemap.ts:11,17`).
- `noindex` en `d/[token]/page.tsx:19` (también `googleBot` y `nocache`), `invitacion/[token]/page.tsx:14`, `(auth)/login/page.tsx:11`, `login/recuperar/page.tsx:10`, `panel/layout.tsx:15`, `w/[slug]/layout.tsx:16`, `sin-acceso/page.tsx:7`; `X-Robots-Tag: noindex` en los PDF (`src/lib/pdf/respuesta.ts:15,31`, `d/[token]/pdf/route.ts:11`).
- 404 real: `.next-verify/server/app/_not-found.meta` → `"status": 404`, `<meta name="robots" content="noindex, nofollow">`, `h1` "No encontramos esta página." (`src/app/not-found.tsx:7,18`).
- Estructura: un `h1` en `/` y en `/en` (conteo 1 y 1 en el build); `h2` por sección con el nombre real en `sr-only` (`titulo-sticky.tsx:10-13`); `h3` en filas (`fila.tsx:29,47`); anclas `#sobre-mi` … `#contacto` con `scroll-mt`; `aria-current` en el menú.
- OG image generada (1200×630 PNG, 39,9 kB, `opengraph-image.body`) con `alt`, cacheada un año; logo con `alt="aguemar"`, `width/height` y `priority` (preload en el head).
- Landing estática (`revalidate = 3600`, `page.tsx:6`), middleware fuera de `/`, formulario cargado con `dynamic()` (`pagina-landing.tsx:24`), fuentes self-hosted por `next/font` con `display: swap` y `size-adjust` (CSS del build), sin `_vercel/insights` en el HTML (se inyecta en cliente).
- JSON-LD con `<` escapado (`pagina-landing.tsx:213`) y catálogo real de `landing_datos()` en `hasOfferCatalog`.
- Test de paridad de idiomas (`tests/unit/landing-contenido.test.ts:41,52`).

## Hallazgos previos verificados

| ID previo | Estado | Evidencia nueva |
|---|---|---|
| SEO-01 `NEXT_PUBLIC_SITE_URL` cae a localhost | **Cerrado** | `src/lib/env.ts:30-32` lanza error si `VERCEL_ENV === "production"` y la URL es localhost (también cuando falta: el `default` de `env.ts:10` es localhost). Build con la variable: `robots.txt.body`, `sitemap.xml.body` y canónica usan `https://aguemar.com`. Matiz: `layout.tsx:28` sigue con `?? "http://localhost:3000"`, pero `env.ts` se importa desde `robots.ts`/`sitemap.ts`, así que el build cae igual. No cubre un valor erróneo distinto de localhost ni los *preview*. |
| SEO-02 Una sola página indexable | **Abierto** | `sitemap.xml.body`: 3 URL (`/`, `/en`, `/privacidad`); no existe `src/app/servicios/`; `areaServed` sigue siendo `Country` (`pagina-landing.tsx:56`); "Lima": 0 en `index.html`. Se retoma como SEO-002. |
| "noindex en login/panel/workspace/portal" | Cerrado | Rutas y líneas en Fortalezas; `_not-found.html` y `d/[token]` llevan `noindex` en el HTML/metadata. |
| "X-Robots-Tag en PDF" | Cerrado | `src/lib/pdf/respuesta.ts:15,31`. |
| "404 propia" | Cerrado | `_not-found.meta` `status: 404`. |
| "JSON-LD con `<` escapado" | Cerrado | `pagina-landing.tsx:213` `.replace(/</g, "\\u003c")`. |
| CON-01 medición (solo lo que toca a SEO) | Parcial | `<Analytics />` de `@vercel/analytics` (`pagina-landing.tsx:75`) y `Medicion` propia; activación en Vercel pendiente según `CLAUDE.md` (fase 15). No verificable desde el código. |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | SEO-001 |
| Título | `/en` se comparte sin imagen: no tiene `og:image` ni `twitter:image` |
| Severidad | Media |
| Evidencia | `.next-verify/server/app/en.html`: 0 coincidencias de `og:image` (en `index.html` y `privacidad.html` sí están, con `?34bd620e0e759ceb`). Causa: `src/lib/landing-meta.ts:14-15` define `openGraph` y `twitter` sin `images`; Next no fusiona en profundidad y en el segmento hijo `/en` el objeto del page sustituye al heredado, perdiendo la imagen de archivo `src/app/opengraph-image.tsx` (en `/` está en el mismo segmento y sí se fusiona). |
| Impacto | Todo enlace a `/en` en WhatsApp, LinkedIn o X sale como tarjeta de solo texto; `summary_large_image` sin imagen degrada a nada. Afecta a la captación en inglés, la única que necesita esa URL. |
| Recomendación | En `metadataLanding` añadir `openGraph.images` y `twitter.images` explícitos: `[{ url: "/opengraph-image", width: 1200, height: 630, alt: m.tituloCorto }]` (o re-exportar `opengraph-image.tsx` en `src/app/en/`). Verificar con el HTML del build que `en.html` lleve `og:image`. Opcional: imagen en inglés con `alt` traducido. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | SEO-002 |
| Título | Una sola página comercial, centrada en la persona, sin ciudad ni términos de búsqueda (SEO-02 sigue abierto) |
| Severidad | Alta |
| Evidencia | `index.html` (texto visible + metadatos): "Lima" 0, "diseño web" 0, "desarrollo web" 0, "páginas web" 0, "soporte técnico" 8, "Perú" 10. `<title>` de 73 caracteres "Alejandro Guevara M. · Especialista TI y Desarrollador Frontend \| aguemar" (`landing-textos.ts:17`): Google corta hacia los 60, la marca queda fuera. `sitemap.xml.body`: 3 URL. `MarcaLanding.direccion` existe (`src/lib/landing.ts:24`) pero no se usa en la landing. |
| Impacto | Sin página de aterrizaje para "soporte técnico para empresas en Lima", "mantenimiento de laptops Lima", "desarrollo web Perú", el tráfico orgánico solo llega por marca o nombre propio. Negocio: la captación (objetivo a 3 meses) depende de WhatsApp y referidos. |
| Recomendación | Dos etapas. (1) **S**, sin tocar el diseño: título/descripción con intención y ciudad ("Especialista TI y desarrollador frontend en Lima, Perú · soporte técnico y webs para empresas \| aguemar", ≤60 caracteres de lo esencial), una mención natural de la ciudad en `sobreMi.p2` o `servicios.intro` y `addressLocality` en JSON-LD (SEO-003). (2) **M/L**: páginas `/servicios/soporte-tecnico-empresas`, `/servicios/desarrollo-web`, `/servicios/diseno` (estáticas con `revalidate`, alimentadas por `landing_datos()` por área y con texto propio, FAQ y CTA), enlazadas desde `#servicios` y añadidas a `sitemap.ts`; el portafolio de la fase 16 como `/proyectos`. Ciudad: `[PENDIENTE: ciudad y distrito de atención]`. |
| Esfuerzo | S (etapa 1) / L (etapa 2) |
| Dependencias | SEO-003; fase 16 (portafolio); PRO/PM para la autorización de clientes |

| Campo | Contenido |
|---|---|
| ID | SEO-003 |
| Título | JSON-LD `ProfessionalService` incompleto para resultados enriquecidos, con propiedad inválida y datos que la página no muestra |
| Severidad | Media |
| Evidencia | JSON-LD de `index.html` (generado en `pagina-landing.tsx:48-65`): sin `address`, `image`, `priceRange`, `sameAs`, `@id`; `telephone` ausente en el build (teléfono nulo en los datos usados); `logo` = `https://aguemar.com/logo.svg` (SVG); `inLanguage` no es propiedad de `ProfessionalService`/`Organization` en schema.org (es de `CreativeWork`); `founder.name` = "Alejandro Fritz Guevara Martínez" y `email` = correo personal de Gmail, mientras `CLAUDE.md` fija que la landing no muestra datos personales del responsable y el `h1` dice "Alejandro Guevara M."; en `en.html` el catálogo (`Mantenimiento preventivo`…) va en español con `inLanguage: "en"`. |
| Impacto | Google exige `name` + `address` (y recomienda `image`, `telephone`, `priceRange`) para el resultado enriquecido de `LocalBusiness`; hoy no cualifica y `logo` en SVG tampoco se usa. `inLanguage` produce un aviso en el validador. El nombre legal completo y el correo personal quedan expuestos a buscadores y *scrapers* sin que la página los muestre. |
| Recomendación | `@graph` con (a) `ProfessionalService` {`@id`, `name` = `marca.nombre_comercial`, `url`, `image` y `logo` en PNG (p. ej. `/opengraph-image` y un `logo.png` 112×112+), `telephone`, `email` del dominio, `address` {`addressLocality`, `addressRegion`, `addressCountry: "PE"`} o, si no hay dirección pública, `areaServed` con `City` + `Country`, `priceRange`, `sameAs` [LinkedIn, GitHub…], `hasOfferCatalog`} y (b) `Person` {`name` igual al `h1`, `jobTitle` = cargo, `worksFor` → `@id`, `sameAs`}; quitar `inLanguage` o moverlo a `WebPage`; en `/en`, `name` traducido o `inLanguage: "es"` por ítem. Validar a mano contra schema.org y con la prueba de resultados enriquecidos tras publicar. |
| Esfuerzo | S |
| Dependencias | SEO-002 (ciudad); SEC/LEG por la decisión de qué datos del responsable se publican |

| Campo | Contenido |
|---|---|
| ID | SEO-004 |
| Título | `<html lang="es-PE">` fijo también en `/en` |
| Severidad | Baja |
| Evidencia | `src/app/layout.tsx:35`; `en.html`: `<html lang="es-PE">` y `<div lang="en">` (`pagina-landing.tsx:70`). El `<title>`, los `<meta>` y el `h1`/`nav` fuera del `div` quedan declarados en español. |
| Impacto | Google se guía por `hreflang` y el contenido, así que el efecto en ranking es mínimo; Bing y los lectores de pantalla sí usan `lang` del documento (se cruza con A11Y). |
| Recomendación | Grupos de rutas con layout raíz propio: `app/(es)/layout.tsx` (`lang="es-PE"`) para `/`, `/privacidad`, panel… y `app/(en)/en/layout.tsx` (`lang="en"`), compartiendo fuentes y `ThemeProvider` desde un componente común. Evitar leer `headers()` en el layout (volvería dinámica la landing). |
| Esfuerzo | M |
| Dependencias | A11Y (mismo hallazgo) |

| Campo | Contenido |
|---|---|
| ID | SEO-005 |
| Título | `/d/` y `/login` bloqueados en `robots.txt` además de `noindex`: el `noindex` nunca se lee |
| Severidad | Baja |
| Evidencia | `robots.txt.body`: `Disallow: /d/`, `Disallow: /login`; `d/[token]/page.tsx:19` y `(auth)/login/page.tsx:11` con `robots: { index: false }`; la landing enlaza `/login` dos veces (`pagina-landing.tsx:121,161`). |
| Impacto | Una URL bloqueada por robots no se rastrea, así que Google no ve el `noindex` y, si recibe un enlace externo (un cliente que publica su `/d/<token>` o cualquiera que enlace `/login`), puede listarla como "URL sin información" con el token a la vista. |
| Recomendación | Quitar `/d/` y `/login` del `disallow` y dejar que el `noindex` (ya presente, con `X-Robots-Tag` en el PDF) haga su trabajo; mantener `/api/`, `/panel`, `/w/`, `/sin-acceso`, `/invitacion/`. Añadir `X-Robots-Tag: noindex` como cabecera en `next.config.ts` para `/d/:path*` y `/login` como red adicional. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | SEO-006 |
| Título | Detalles de coherencia: sitemap sin `lastmod`, canónica sin barra vs sitemap con barra, `hreflang` "es" en el selector, `/privacidad` sin `og:locale` |
| Severidad | Baja |
| Evidencia | `sitemap.xml.body` sin `<lastmod>` (`sitemap.ts:7-19`; `changefreq`/`priority` los ignora Google); canónica `https://aguemar.com` (`index.html`) vs `<loc>https://aguemar.com/</loc>`; `selector-idioma.tsx:16` `hrefLang="es"` frente a `es-PE` en `landing-meta.ts:12`; `privacidad.html` sin `og:locale` ni `og:url`. |
| Impacto | Cosmético; Google normaliza la raíz con y sin barra. `lastmod` real ayuda a que recrawlee tras cambiar textos o servicios. |
| Recomendación | `lastModified` en `sitemap.ts` (fecha de `REVISADA` para `/privacidad` y `updated_at` máximo de servicios/marca para las landings), `canonical: "/"` → emitir con barra o quitar la barra del sitemap, `hrefLang` del selector = `es-PE`, `openGraph.locale/url` en `/privacidad`. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | SEO-007 |
| Título | CWV de laboratorio (no verificable sin servidor): 242 kB de JS y hero animado desde `opacity: 0` retrasan el LCP |
| Severidad | Baja |
| Evidencia | Build: `/` y `/en` 242 kB First Load (174 kB compartidos: Sentry + layout raíz + `next-themes`/`sonner`, más `@vercel/analytics`), 17 `<script async>` en `index.html`. `globals.css:157-165`: `.entrada > :not(:first-child)` arranca con `opacity: 0` y retrasos de 60–460 ms (`backwards`); el `h1` (candidato a LCP) es el tercer hijo. `[data-revelar]` oculto hasta 2,5 s sin JS (`globals.css:167-170`), pero el texto está en el HTML: el rastreo no se ve afectado. Fuentes: 8 woff2 (104 kB) con `swap` y `size-adjust`; el HTML prerenderizado no trae `<link rel="preload" as="font">`. |
| Impacto | Chrome no cuenta como pintado un elemento con `opacity: 0`: el LCP se desplaza unos 0,2–0,6 s en laboratorio; el JS no bloquea el render (todo `async`) y las animaciones usan `translate`/`opacity`, sin CLS. Sin métricas de campo no se puede afirmar que haya una pérdida real. |
| Recomendación | Excluir el `h1` de `.entrada` (o animar solo desde `opacity: .01`), medir con PageSpeed Insights al publicar y revisar en DevTools si las fuentes `.p.woff2` se precargan; valorar con PER si Sentry debe cargar en la landing (cliente) y activar Vercel Analytics para tener CWV de campo. |
| Esfuerzo | S |
| Dependencias | PER (bundle compartido); fase 15 (Vercel Analytics) |

## Supuestos y preguntas abiertas

- **Datos del build**: el HTML de `.next-verify` se generó contra la rama `staging`: sin teléfono (no hay enlaces de WhatsApp ni `telephone` en JSON-LD) y con el correo personal. En producción salen de Mi marca: confirmar que ahí están el WhatsApp y un correo del dominio (`hola@aguemar.com`).
- **Search Console / Bing Webmaster**: no hay `verification` en `layout.tsx` ni meta `google-site-verification` en el HTML; si la propiedad se verificó por DNS no se puede saber desde el repo. Pregunta: ¿está verificada, se envió el sitemap y hay datos de cobertura?
- **Google Business Profile**: no es verificable desde el código. Requiere decidir si se publica una ciudad/dirección (`marca.direccion` existe pero la landing no la muestra por diseño). Es la palanca local más barata junto a SEO-002.
- **Audiencia de `/en`**: ¿hay clientes angloparlantes? Si no, el esfuerzo en SEO-001/SEO-004 baja de prioridad; si sí, convendría traducir el catálogo y la política de privacidad ("Privacy (in Spanish)").
- **Portafolio (fase 16)** y **blog/casos**: sin autorización de clientes (pregunta 5 del plan) el portafolio seguirá anónimo; aun así páginas de servicio con FAQ propias (SEO-002) no dependen de ello.
- **Métricas de campo** (CWV, tráfico, consultas): no determinables; SEO-007 queda en laboratorio y "no verificable".
- Fuera de alcance aquí: `manifest`/`theme-color` (PWA, no SEO) y el rendimiento del bundle compartido (informe 08).
