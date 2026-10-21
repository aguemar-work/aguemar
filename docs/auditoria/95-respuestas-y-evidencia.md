# 95 · Respuestas y evidencia nueva (21/10/2026)

Alejandro respondió las preguntas 1–5 del plan y compartió capturas de Vercel, Sentry e InsForge (producción). Este documento registra qué cambia en la auditoría. Las capturas no se guardan en el repo; aquí solo va lo que se leyó en ellas, sin IP ni claves.

## 1. Respuestas y su efecto

| Pregunta | Respuesta | Qué cambia |
|---|---|---|
| 1 · Uso real | Nadie usa el workspace todavía. Hay dos clientes con los que se trabaja por WhatsApp. No hay colaboradores | Los riesgos de cifras y de aislamiento son **latentes**, no activos: hay tiempo de corregirlos antes de abrir el workspace. El valor inmediato es que esos dos clientes quieran entrar. PRO-004 (colaborador) pasa a Won't por ahora |
| 2 · Objetivo | Que el sistema sea mejor y accesible para los clientes y para él | Suben UX y accesibilidad del workspace y del panel (PRO-008, UX-005, A11Y quick wins). Las páginas SEO por servicio (SEO-002 etapa 2) bajan a Could |
| 3 · Comprobantes | Factura o recibo por honorarios desde SUNAT, descargado y subido al sistema. Sin integración con SUNAT | Confirma el alcance de PRO-003: adjuntar el PDF al cobro en Storage privado, descargable desde el workspace y el portal. Emisión electrónica: Won't |
| 4 · Cotización | Siempre se descarga y se manda por WhatsApp. Con acceso al sistema también irá por ahí, pero al final siempre se envía al contacto la cotización aceptada por WhatsApp | La mayoría de aceptaciones las registrará Alejandro desde el panel, así que PRO-007 (rótulo "registrada por aguemar") pesa más. El PDF mandado por WhatsApp tiene que coincidir con lo que se acepta, así que PRO-001 aplica también al PDF descargado. Hallazgo nuevo PRO-012 (§3) |
| 5 · Portafolio | Solo los trabajos; el cliente aparece únicamente si lo autoriza | El portafolio deja de estar bloqueado. Se hace anónimo por defecto, con un campo opcional de consentimiento del cliente |

Preguntas que siguen abiertas: plan de horas (13), segundo operador (14), asesoría legal (15), y las nuevas del §4.

## 2. Lo que muestran las capturas

| Fuente | Hecho | Hallazgo afectado |
|---|---|---|
| Vercel | Plan **Hobby** confirmado. Web Analytics activo: 1 visitante y 9 vistas en 7 días, Perú, Windows (inferencia: el propio Alejandro). Eventos propios solo en Pro | DEV-007 pasa de supuesto a hecho. Fase 15 "activar Analytics": hecho. Speed Insights: no se vio |
| Sentry | **DSN conectado**: proyecto `aguemar`, entorno production, issue AGUEMAR-1 (5 eventos, 3 "usuarios", último hace 16 h) | DEV-003 y PM-004 quedan **parciales**: falta reportar desde cron, PDF y acciones (COD-001) y el uptime |
| Sentry, AGUEMAR-1 | Reporte CSP `script-src` por `eval` desde un chunk de `/`, con política Report-Only. El evento guarda **IP y ciudad** del visitante | Hallazgo nuevo SEC-011 (§3). El `eval` lo causaba Zod con JIT: el arreglo `aed5d77` es del 20/10 a las 17:15 y el build local de `f47ac68` no contiene `new Function` ni `eval(` en ningún chunk (`grep` sobre `.next-verify/static/chunks`). Inferencia: los eventos son del despliegue previo o de pestañas abiertas antes |
| InsForge, producción | Plan gratuito, instancia **nano** (0,5 GB RAM, 2 vCPU); subir de instancia exige el plan Start. Memoria al 75–80 % con aviso "queda poco margen"; CPU 2 %; disco 5,8 de 7,9 GB (casi todo sistema; la base pesa 0,02 GB) | Hallazgo nuevo DEV-008 (§3) |
| InsForge, producción | "Última copia hace 16 h": hay un respaldo del proveedor del 20/10 | DEV-002 y PM-002 siguen abiertos: el respaldo existe, la restauración no se ha probado |
| InsForge, producción | 3 usuarios, 33 tablas (igual que staging), **2 funciones edge** | Hallazgo nuevo SEC-010 (§3). Pregunta: quiénes son los 3 usuarios si nadie usa el workspace |
| InsForge, asesor | 82 avisos (41 de seguridad, 41 de rendimiento), **último escaneo hace 5 días**, antes de la fase 14.5. Lista `ws_admin_set_password`, que la migración `inmutabilidad-aceptados` borró el 20/10 (en staging ya no existe: consulta a `pg_proc` sin filas) | Reescanear producción para confirmar SEG-02 y ver los 41 de rendimiento, que esta auditoría no pudo leer |
| InsForge, ajustes | Versión v2.3.3, con v2.3.4 disponible. Clave de API `ik_…` con botón "Rotar" | Parte de DEV-008 y SEC-008 |

## 3. Hallazgos nuevos

| Campo | Contenido |
|---|---|
| ID | SEC-010 |
| Título | Dos funciones edge del sistema anterior (SGTD) siguen activas; `invite-user` crea cuentas con la clave de administrador para cualquier usuario autenticado |
| Severidad | **Alta** |
| Evidencia | `npx insforge functions list` (staging) → `invite-user` y `delete-user`, creadas el 18/06/2026, cuatro meses antes del proyecto; producción muestra "2 funciones" (captura). `npx insforge functions code invite-user`: tras validar solo que el JWT sea de un usuario, llama `buscarAuthUserPorEmail` y `crearAuthUserPorEmail` con `API_KEY` (API de administración) y **después** llama la RPC `sgtd_invitar_a_workspace`, que ya no existe (`migrations/20261013171105_limpiar-esquema-sgtd.sql:64`; consulta a `pg_proc` en staging sin filas). `delete-user` depende de `sgtd_es_plataforma_owner` (borrada en `:57`), así que responde 403 siempre. Ninguna de las dos se usa desde `src/` (`rg "functions\.invoke"` → vacío). CORS `*` en ambas |
| Impacto | Hecho: cualquier cuenta autenticada puede hacer que el servidor cree cuentas de InsForge para correos arbitrarios, con privilegios de administrador; la RPC falla después, pero la cuenta ya quedó creada. Con el registro abierto (SEC-002), "autenticada" significa "cualquiera". Inferencia: permite ocupar el correo de una empresa antes de invitarla (el invitado tendrá que recuperar contraseña), llenar Auth de cuentas basura sobre una instancia nano, y devuelve mensajes de error crudos de la API de administración. No da acceso a datos (la RLS exige rol). Es la única pieza del proyecto que usa la clave de administrador fuera de la CLI |
| Recomendación | Borrar las dos funciones en staging y en producción: `npx insforge functions delete invite-user` y `npx insforge functions delete delete-user` en cada contexto. Después, rotar la clave de API (la tenían como secreto) y revisar en Auth → Users que no haya cuentas desconocidas. Añadir al test de inventario o al checklist de despliegue "funciones edge = 0" mientras la app no las use |
| Esfuerzo | S (15 min) |
| Dependencias | SEC-002, SEC-008, DEV-006 (limpieza del sistema heredado) |
| Estado (21/10) | **Funciones borradas** en staging y producción a pedido de Alejandro: el código de producción era idéntico al de staging y se respaldó fuera del repo; `functions list` → "No functions found" en ambos; `POST /functions/invite-user` en producción → 404; aguemar.com → 200; la CLI quedó en staging. **Pendiente:** rotar la clave de API y revisar los 3 usuarios de Auth en producción |

| Campo | Contenido |
|---|---|
| ID | SEC-011 |
| Título | Los reportes CSP llegan a Sentry con IP y ciudad, contra lo que promete `/privacidad` |
| Severidad | Media |
| Evidencia | `src/lib/csp.ts:23-24` y `:28-38`: `report-uri` apunta al endpoint `/security/` de Sentry, que el **navegador** llama directo; `beforeSend: limpiarEvento` (`src/lib/sentry.ts:19`) solo actúa sobre eventos del SDK. AGUEMAR-1 (captura) muestra IP, ciudad y `user: ip:…`. `src/app/privacidad/page.tsx:98-99` dice que Sentry se usa "sin tu nombre, correo, IP, cookies ni lo que escribiste" |
| Impacto | Hecho: el aviso de privacidad no describe lo que pasa. Cada visitante cuyo navegador dispare un reporte CSP deja su IP y ciudad en un servicio de EE. UU. Ley 29733: dato personal tratado sin informarlo (opinión, no asesoría) |
| Recomendación | En Sentry → Settings → Security & Privacy: activar "Prevent Storing of IP Addresses" y "Data Scrubber" con "Use Default Scrubbers"; borrar los eventos existentes de AGUEMAR-1 o la issue completa. Marcar AGUEMAR-1 como resuelta y vigilar si reaparece (si vuelve, el `eval` sigue en algún chunk). Sin cambio de código |
| Esfuerzo | S (10 min) |
| Dependencias | PM-005, SEC-001 |

| Campo | Contenido |
|---|---|
| ID | DEV-008 |
| Título | Producción en la instancia más pequeña con poco margen de memoria, versión desactualizada y asesor sin reescanear |
| Severidad | Baja (Media cuando entren las empresas) |
| Evidencia | Capturas de InsForge: nano 0,5 GB, memoria 75–80 % (máx. 79,6 % en la última hora), disco 5,8/7,9 GB; mejoras de instancia solo desde el plan Start; versión v2.3.3 con v2.3.4 disponible; asesor con último escaneo hace 5 días |
| Impacto | Hoy, con 3 usuarios y CPU al 2 %, no hay problema: Postgres usa la memoria libre como caché. Inferencia: sin margen, un pico (export de respaldo, `panel_resumen` con más datos, PDF en paralelo) puede degradar o reiniciar la base, y subir de instancia exige pasar a pago sin poder probarlo antes |
| Recomendación | Reescanear el asesor en producción ahora y tras cada migración; suprimir los avisos `dangerous-function` con motivo ("cubierto por tests/unit/migraciones.node.test.ts"); revisar los 41 de rendimiento. Actualizar a v2.3.4 primero en staging. Fijar el umbral para pasar a Start (por ejemplo, la primera empresa activa en el workspace o memoria sostenida >85 %) y anotarlo en el README con el coste |
| Esfuerzo | S |
| Dependencias | DEV-002, DEV-007, PER-003 |

| Campo | Contenido |
|---|---|
| ID | PRO-012 |
| Título | El paso final del flujo real, "enviar la cotización aceptada por WhatsApp", no existe: el mensaje dice lo mismo en todos los estados |
| Severidad | Media |
| Evidencia | `src/app/panel/cotizaciones/[id]/acciones-cotizacion.tsx:91-93` ofrece "Mensaje para WhatsApp" en cualquier estado; `:237-241` arma siempre "te envío la cotización … válida hasta el … aceptarla". El PDF del panel ya sale de la copia congelada (`cotizacion_panel`, CLAUDE.md) |
| Impacto | Respuesta 4: el cierre de cada venta es mandar al contacto la cotización aceptada por WhatsApp. Hoy hay que redactarlo a mano, y el texto propuesto invita a aceptar algo ya aceptado |
| Recomendación | Si `estado === "aceptada"`: texto "Te confirmo la cotización {numero} aceptada el {fecha} por {nombre}, por {total}. Te adjunto el PDF aceptado" más el enlace al PDF congelado (portal o workspace) y el botón "Descargar PDF aceptado". Mostrarlo como acción principal tras "Marcar aceptada" |
| Esfuerzo | S |
| Dependencias | PRO-001, PRO-007 |

## 4. Preguntas nuevas

1. ¿Quiénes son los 3 usuarios de producción si nadie usa el workspace? Revisar en InsForge → Auth → Users. Si alguno no es tuyo, viene del registro abierto (SEC-002) o de `invite-user` (SEC-010).
2. ¿Las funciones edge de producción son las mismas dos (`invite-user`, `delete-user`)? La captura solo dice "2 funciones".
3. ¿Speed Insights está activado en Vercel? Sin él no hay CWV de campo (PER-001, SEO-007).
4. ¿Hay monitor de uptime? No aparece en las capturas.
