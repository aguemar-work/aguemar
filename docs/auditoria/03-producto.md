# 03 · Producto

> Auditoría externa · 20/10/2026 · `main` = `f47ac68` · Perfil: Product Owner · Solo lectura. Evidencia propia (archivo:línea). No repite los hallazgos técnicos de `01-arquitectura.md`, `02-calidad.md`, `05`–`10`; se centra en valor, flujo de negocio y huecos funcionales. Las preguntas 1–5 del plan no fueron respondidas: lo que depende de ellas va marcado como **supuesto** o **pregunta abierta**.

## Diagnóstico general

aguemar Studio es, hoy, un **sistema de operación y cobro para un estudio unipersonal** con tres caras: una landing que capta leads, un panel donde Alejandro cotiza, ejecuta y cobra, y un workspace donde cada empresa cliente ve "lo suyo" (proyectos, documentos PDF, cotizaciones, saldo) y acepta con nombre y DNI. El ciclo lead → empresa → cotización → aceptación → trabajo → documentos → cobro → recordatorio **existe de punta a punta y está implementado con más rigor del habitual** (aceptación congelada con huella, cobros FIFO, cron de recordatorios). Lo que aporta valor hoy: al propietario, orden y trazabilidad; a la empresa, un lugar donde ver y aceptar sin pedirlo por chat. Lo que falta no es "más módulos": es cerrar los bordes del ciclo (qué pasa cuando algo se cancela, se paga o se edita después de enviarse), hacer que el colaborador y el soporte técnico tengan flujo propio, y que la landing venda lo mismo que el catálogo ofrece.

## Fortalezas

- **El ciclo comercial cierra solo**: aceptar crea trabajo, etapa "Alcance" y una tarea por ítem (`db/funciones/cotizacion_aceptar_core.sql:54-74`); el acta aceptada pasa el trabajo a `entregado` (`db/funciones/acta_aceptar_core.sql:41-44`); la deuda se calcula en la base y alimenta panel, workspace y cron (`db/funciones/deudas_cotizacion.sql`, `cobro_recordatorios_tomar.sql:25-31`: previo, atraso 1 y 7 días).
- **Lo declarado en `CLAUDE.md` existe**: convertir solicitud en trabajo o cotización (`src/app/panel/calendario/acciones.ts:112,149`), enviar código de recuperación y quitar acceso desde la ficha de empresa (`src/app/panel/clientes/acciones.ts:163,176`; `[id]/acceso.tsx:111-134`), perfiles Soporte/Proyecto/Completo (`src/lib/invitaciones.ts:22-41`), invitación de un solo uso con enlace para WhatsApp (`invitaciones.ts:13-19`).
- **La empresa recibe un espacio útil desde el primer día**: inicio con activos, entregados, pedidos abiertos, por responder, saldo y próximo pago (`src/app/w/[slug]/page.tsx:34-92`), agenda, últimos informes y respuestas a sus comentarios; historial de cobros en Cotizaciones (`src/app/w/[slug]/cotizaciones/page.tsx:111-115`).
- **El inicio del panel es una lista de atención, no un dashboard decorativo**: `panel_resumen()` reúne entregas vencidas, tareas vencidas, comentarios sin leer, cotizaciones sin respuesta, deudores, mantenimientos a 30 días, agenda y leads nuevos (`db/funciones/panel_resumen.sql:57-163`).
- **Captación con origen medido**: eventos `whatsapp_click`, `correo_click`, `contacto_enviado` por origen y UTM (`src/lib/origen.ts`, `src/app/panel/leads/page.tsx:30-69`), lead garantizado con respaldo por correo.

## Mapa funcional

| Módulo | Estado | Evidencia | Hueco principal |
|---|---|---|---|
| Panel · Inicio / Bandeja | Completo | `panel_resumen.sql`, `bandeja/page.tsx` | Responder comentario no es en línea (UX-005) |
| Panel · Trabajos | Completo | `trabajos/acciones.ts` (etapas, tareas, entregables) | Sin responsable ni asignación por tarea; estados sin reglas (cualquier transición, `:53-67`) |
| Panel · Calendario / Solicitudes | Funcional con huecos | `calendario/acciones.ts:85-180`, `ws_solicitar.sql` | Solicitud = pedido genérico; sin tipo incidencia, SLA ni recurrencia |
| Panel · Informes | Completo | `src/lib/informe.ts`, `informes/*` | — |
| Panel · Documentos (FT/BR/AE) | Completo | `fichas/*`, `briefs-actas`, portal `/d/[token]` | Ficha atada a script PowerShell (Windows) |
| Panel · Empresas / acceso / módulos | Completo | `clientes/[id]/{acceso,modulos}.tsx` | Un solo usuario por empresa |
| Panel · Equipos | Completo (soporte) | `equipos/*`, `ws_equipos` | Sin licencias, credenciales ni garantías |
| Panel · Leads | Funcional con huecos | `leads/acciones.ts:44-74` | Conversión parcial (RUC vacío), sin cotizar desde el lead |
| Panel · Cotizaciones y cobros | Funcional con huecos | `cotizaciones/acciones.ts` | Editable tras enviarse; aceptada no se anula; cobro solo se borra; sin comprobante |
| Panel · Ajustes (marca, servicios, plantillas, equipo) | Completo | `nav.ts:38-43` | `[PENDIENTE]` en precios y datos legales (UX-001) |
| Workspace · 7 módulos | Completo | `src/lib/modulos.ts:25-33`, `src/app/w/[slug]/*` | Sin "Mi cuenta", sin pedir cambios en una cotización, sin ver quién trabaja |
| Comprobantes (fase 16) | Declarado y no existente | `rg -i comprobante src migrations` → solo `recordatorio-pago.ts:103` | — |
| Portafolio (fase 16) | Declarado y no existente | `landing-contenido.ts:61-94` (4 proyectos sin cliente) | Sin autorización de clientes (pregunta 5) |

## Hallazgos

| Campo | Contenido |
|---|---|
| ID | PRO-001 |
| Título | Una cotización enviada sigue siendo editable sin versión: el cliente puede aceptar algo distinto de lo que vio |
| Severidad | Alta |
| Evidencia | `src/app/panel/cotizaciones/acciones.ts:38-46` (solo bloquea `aceptada`; borra y reinserta los ítems de una `enviada`); `[id]/acciones-cotizacion.tsx:55,84-90` (`editable = estado !== "aceptada"`); la copia con huella se toma **al aceptar**, no al enviar (`cotizacion_aceptar_core.sql:49-52`). `enviarCotizacion` manda aviso y enlace del portal (`acciones.ts:81-83`), pero una edición posterior no vuelve a avisar. |
| Impacto | Hecho: el enlace que la empresa guardó muestra siempre la versión en vivo. Inferencia: un cambio de precio o condiciones tras enviar y antes de aceptar deja una aceptación válida sobre un texto que el cliente no leyó; es el riesgo R-02 de `ARQUITECTURA.md` §6, aceptado pero sin mitigación de producto. Negocio: disputa sin forma de probar qué se envió. |
| Recomendación | Congelar `cotizacion_contenido` también al enviar (`enviada_documento` + huella) y mostrar esa copia en workspace y portal; editar una enviada = "nueva versión" (reusar `duplicarCotizacion`) o "reenviar" que renueva la copia, la fecha y el aviso. Mostrar "v2 · reenviada el …" en el documento. |
| Esfuerzo | M |
| Dependencias | ARQ-001 (una sola fuente de pendiente), ADR-07 |

| Campo | Contenido |
|---|---|
| ID | PRO-002 |
| Título | Lo aceptado no tiene marcha atrás: ni anular una cotización aceptada ni anular un cobro con rastro |
| Severidad | Alta |
| Evidencia | `rechazarCotizacion` excluye `aceptada` (`acciones.ts:113`); eliminar aceptada bloqueado (`acciones.ts:177`, triggers de inmutabilidad); el trabajo sí se cancela (`trabajos/acciones.ts:53-67`, sin reglas) pero `deudas_cotizacion.sql:31` solo mira `estado='aceptada'` y el cron sigue recordando mientras `pendiente > 0 and recordar_pago` (`cobro_recordatorios_tomar.sql:31`). La única salida es apagar `recordar_pago` a mano (`actualizarPagoCotizacion`, `acciones.ts:226`). Cobros: `eliminarCobro` hace `delete` físico tras `window.confirm` (`acciones.ts:211-221`, `cobros.tsx:150`). |
| Impacto | Hecho: si un proyecto aceptado se cae, la empresa sigue viendo "saldo pendiente" y "vencido" en su inicio (`w/[slug]/page.tsx:78-87`) y recibe recordatorios de pago por un trabajo cancelado. Un cobro registrado por error desaparece sin historial (contabilidad). |
| Recomendación | Estado `anulada` para cotizaciones aceptadas (motivo, fecha, quién; conserva la aceptación y su huella) que las saque de `deudas_cotizacion`; cancelar el trabajo ofrece anular su cotización. En cobros, `anulado_en`/`motivo` en vez de borrar, y mostrarlos tachados. |
| Esfuerzo | M |
| Dependencias | PRO-001, ARQ-001 |

| Campo | Contenido |
|---|---|
| ID | PRO-003 |
| Título | El ciclo de cobro termina sin comprobante ni constancia para la empresa |
| Severidad | Alta |
| Evidencia | `cobros` solo guarda medio y referencia (`cobros.tsx:86-109`); `rg -i comprobante src migrations` → solo el pie del recordatorio que pide al cliente enviarlo por correo (`src/lib/correo/recordatorio-pago.ts:103`); Storage sin uso (`ARQUITECTURA.md` §2); fase 16 sin empezar. |
| Impacto | Negocio: la factura o el recibo por honorarios viajan por WhatsApp fuera del sistema, así que el workspace no es "el lugar donde está todo" justo en lo que más le importa a una empresa (sustentar el gasto). **Supuesto** (pregunta 3 abierta): bastaría adjuntar el PDF emitido fuera. |
| Recomendación | Primera versión en dos pasos: (1) adjuntar PDF al cobro en Storage privado, descargable desde Cotizaciones y cobros y por el portal; (2) constancia automática "Pago recibido" (PDF con la base común) aunque no haya comprobante tributario. Decidir después emisión electrónica. |
| Esfuerzo | M |
| Dependencias | ADR-08; SEC (Storage con RLS) |

| Campo | Contenido |
|---|---|
| ID | PRO-004 |
| Título | El colaborador ejecuta pero no planifica: sin crear trabajos, sin tareas asignadas, sin "mis tareas" |
| Severidad | Media |
| Evidencia | Políticas `_colaborador_*` (`migrations/20261016200506_equipo-invitaciones.sql:211-348`): CRUD en tareas, entregables, actividades, equipos, fichas, informes, briefs, actas y comentarios; **ninguna** `trabajos_colaborador_insert` ni `trabajo_etapas_colaborador_insert`. `rg -i asignad src/types/database.ts` → 0 (solo existe `cliente_asignado`, empresa↔colaborador). Inicio del colaborador sin dinero (`src/lib/datos/equipo.ts:6`). |
| Impacto | Inferencia: cada trabajo y cada etapa los crea el propietario; el colaborador no sabe qué le toca a él frente a otro colaborador de la misma empresa, y Alejandro no ve carga por persona. Opinión: el rol es útil como "manos" supervisadas, no como alguien que descarga trabajo. **Pregunta abierta 14**: si hoy no hay colaboradores reales, baja a prioridad "cuando llegue el primero". |
| Recomendación | `trabajo_tareas.asignado_a` (miembro) con filtro "Mis tareas" en el inicio del colaborador y en `equipo_resumen`; permitir al colaborador crear trabajos en `propuesta` en sus empresas (trigger `_dueno` ya cubre la propiedad). |
| Esfuerzo | M |
| Dependencias | SEC (políticas nuevas), QA-002 |

| Campo | Contenido |
|---|---|
| ID | PRO-005 |
| Título | Soporte técnico sin flujo propio: la solicitud no es un ticket, no hay SLA ni recurrencia, y el perfil "Soporte" no deja pedir ayuda |
| Severidad | Media |
| Evidencia | `ws_solicitar.sql:4` (título, descripción, área, prioridad, fecha deseada); estados `nueva/en_revision/aceptada/rechazada` (`workspace.ts:198`); al convertir queda en `propuesta` (`calendario/acciones.ts:126`); mantenimientos = solo `proximo_mantenimiento` de la ficha a 30 días (`panel_resumen.sql:120-128`), sin actividad recurrente. Perfil Soporte = `documentos, cotizaciones, equipos` (`src/lib/invitaciones.ts:27`): **sin `solicitudes`**. 6 de 6 servicios del seed son de soporte (`db/seed.sql:41-47`). |
| Impacto | Hecho: la empresa que solo contrató soporte no puede reportar una incidencia desde su espacio; vuelve al WhatsApp. Inferencia: el 100 % del catálogo es soporte, así que el flujo más usado es el menos modelado (sin tiempo de respuesta, sin "resuelto", sin adjuntar captura, sin plan mensual). |
| Recomendación | (S) Añadir `solicitudes` al perfil Soporte. (M) `solicitudes.tipo` (`incidencia`/`pedido`) con estado `resuelta` y tiempo objetivo por prioridad mostrado a la empresa. (M) Recurrencia: al cerrar una ficha con `proximo_mantenimiento`, crear la actividad `mantenimiento` visible en el calendario de la empresa. |
| Esfuerzo | S + M |
| Dependencias | PRO-004 (quién atiende) |

| Campo | Contenido |
|---|---|
| ID | PRO-006 |
| Título | La landing vende dos oficios, pero el catálogo y el JSON-LD solo ofrecen soporte; el portafolio es anónimo |
| Severidad | Media |
| Evidencia | `src/lib/landing-textos.ts:45-60` (Desarrollador Frontend / Diseñador + Especialista TI); `db/seed.sql:41-47` (6 servicios, todos `soporte`, `precio_base null` → `[PENDIENTE]` en `servicios/lista-servicios.tsx:104`); `pagina-landing.tsx:63` arma `itemListElement` solo con servicios de la base; `landing-contenido.ts:61-94` (4 proyectos "hecho a medida", sin cliente ni enlace). |
| Impacto | Inferencia: quien llega por diseño o desarrollo no encuentra oferta estructurada ni prueba verificable; los datos enriquecidos describen un negocio distinto del que el texto cuenta (SEO-003 lo ve desde SEO; aquí es coherencia comercial). **Supuesto**: producción tiene el mismo catálogo que el seed (no verificable). **Pregunta abierta 5**: sin autorización, el portafolio seguirá anónimo. |
| Recomendación | Cargar servicios de diseño y desarrollo (con unidad y "precio a cotizar"); pedir autorización escrita a 1–2 clientes y, con ella, `trabajos.en_portafolio` + imagen + resumen público (fase 16). Mientras tanto, enlazar los proyectos propios que sí son públicos. |
| Esfuerzo | S (catálogo) / M (portafolio) |
| Dependencias | SEO-002/003, UX-001 |

| Campo | Contenido |
|---|---|
| ID | PRO-007 |
| Título | Aceptación con nombre y DNI sin segundo factor ni confirmación a la empresa; "marcar aceptada" del panel pesa igual que la del cliente |
| Severidad | Media |
| Evidencia | `src/components/documentos/aceptar-documento.tsx:35-47,64-79` (nombre prellenado con el contacto, DNI de 8 dígitos, casilla); `cotizacion_aceptar_core.sql:31-44` valida vigencia y formato; desde el panel el DNI es opcional (`cotizaciones/acciones.ts:97`, `p_dni || null`; `acta_aceptar_core.sql:27`). Se guardan IP, user-agent, huella y `registrada_por` (`cotizacion_aceptar_core.sql:51-52`); no hay correo de confirmación al aceptar (`rg aceptad src/lib/correo/avisos.ts` → aviso al propietario, no copia a la empresa). |
| Impacto | **Supuesto** (pregunta 4): aceptable para montos bajos. Inferencia: ante un "yo no acepté", la prueba es técnica (IP, huella) y el cliente no recibió nunca una copia de lo que aceptó; la aceptación hecha por el propietario "en nombre de" no se distingue en la UI de la empresa. |
| Recomendación | Correo a la empresa al aceptar con número, huella y PDF congelado adjunto o enlazado; rótulo "aceptada por aguemar en nombre de …" vs "aceptada por la empresa" en vista y PDF; opcional: código por correo (OTP) para aceptar desde el portal. |
| Esfuerzo | S (correo y rótulo) / M (OTP) |
| Dependencias | PRO-001; LEG (pregunta 15) |

| Campo | Contenido |
|---|---|
| ID | PRO-008 |
| Título | El workspace muestra mucho pero da pocas razones para volver y no deja a la empresa gestionar su cuenta ni objetar |
| Severidad | Media |
| Evidencia | `rg -i 'contraseña|password|cuenta' src/app/w src/components/workspace` → 0: no hay "Mi cuenta"; cambiar contraseña depende de que el propietario envíe el código (`clientes/[id]/acceso.tsx:111-128`) o de `/login/recuperar`. Avisos solo on/off por empresa (`clientes.avisos_correo`), sin preferencias. `ws_trabajo.sql:11-18` no expone responsable. Sin acción de "pedir cambios" en la cotización (UX-005). Un usuario por empresa (`clientes.usuario_id`). `ultimo_ingreso` se registra (`w/[slug]/layout.tsx:29`) pero no se reporta. |
| Impacto | Inferencia: la empresa entra cuando le llega un correo (cotización, informe, recordatorio) y sale; sin autogestión ni interacción de doble vía, el espacio se percibe como "vitrina" y la conversación vuelve al chat. Negocio: menor adopción justo del argumento de venta "Tu espacio" (`landing-contenido.ts:43-48`). |
| Recomendación | "Mi cuenta" (contraseña, correo de avisos, qué avisos); "Tengo dudas / pedir cambios" en la cotización que cree un comentario en la Bandeja; mostrar responsable del trabajo; tarjeta "Empresas sin entrar en 30 días" en el panel a partir de `ultimo_ingreso`. |
| Esfuerzo | M |
| Dependencias | SEC-002 (sesiones), UX-005 |

| Campo | Contenido |
|---|---|
| ID | PRO-009 |
| Título | Lead → empresa → cotización pide datos dos veces y pierde el contexto del contacto |
| Severidad | Baja |
| Evidencia | `leads/acciones.ts:53-64`: crea la empresa con `tipo_doc: "RUC", num_doc: ""`, deduce "Empresa:" del mensaje por regex y vuelca el resto en `notas`; después hay que completar RUC, slug, módulos e invitación en la ficha; no existe "cotizar desde el lead" (solo desde empresa o solicitud, `calendario/acciones.ts:149`). `panel_resumen.sql:163` cuenta `leads_nuevos` pero no su antigüedad. |
| Impacto | Opinión: tres pantallas para lo que es un solo gesto comercial ("me escribió, le cotizo"); un lead viejo no se distingue de uno de hoy. |
| Recomendación | "Convertir y cotizar" en un paso que abra la cotización en borrador con el interés como primera línea; `leads_sin_contactar_24h` en el inicio. |
| Esfuerzo | S |
| Dependencias | — |

| Campo | Contenido |
|---|---|
| ID | PRO-010 |
| Título | Se mide la captación, no la conversión ni el cobro |
| Severidad | Baja |
| Evidencia | Hoy: `eventos_landing` por evento y origen (`leads/page.tsx:33-35,64-69`), estados de lead, `ultimo_ingreso`. Los datos para lo demás ya existen: `enviada_en`, `aceptada_en`, `rechazada_en`, `motivo_rechazo` (`cotizaciones`), `cobros.fecha`, `leads.cliente_id`; ninguna función los agrega. |
| Impacto | Inferencia: no se puede responder "¿qué porcentaje de cotizaciones acepto?", "¿cuánto tardo en cotizar?", "¿cuántos días tardo en cobrar?" ni "¿qué empresa no entra nunca?", que son las preguntas de negocio de los tres objetivos (captar/operar/cobrar, pregunta 2). |
| Recomendación | `panel_metricas(p_desde, p_hasta)`: tasa de aceptación y motivos de rechazo, mediana lead→cotización y cotización→aceptación, días de cobro reales, ingresos por empresa en el periodo; una pestaña "Métricas" en Ventas. |
| Esfuerzo | S/M |
| Dependencias | ARQ-001 (misma fuente de pendiente) |

| Campo | Contenido |
|---|---|
| ID | PRO-011 |
| Título | Multi-moneda a medias y ficha técnica solo para Windows |
| Severidad | Baja |
| Evidencia | `Moneda = "PEN" \| "USD"` en cotizaciones y cobros; `deudas_cotizacion` reparte por moneda, pero el inicio del workspace suma `total_aceptado − total_cobrado` sin moneda y lo pinta en S/ (`w/[slug]/page.tsx:81`; `workspace.ts:104` "pendiente (soles)"); sin tipo de cambio. `diagnosticoSchema` exige `herramienta: "diagnostico-agueMar.ps1"` (`src/lib/diagnostico.ts:21`): sin equivalente para macOS/Linux. |
| Impacto | Inferencia: con una sola cotización en USD, la tarjeta "Saldo pendiente" de la empresa muestra una cifra mezclada. Ficha: los equipos no Windows se llenan a mano. **Pregunta abierta**: ¿hay cotizaciones en USD o equipos no Windows en producción? |
| Recomendación | O limitar a PEN hasta que haga falta (quitar USD del formulario) o totales por moneda en inicio y PDF. Ficha: plantilla manual mínima documentada; script bash si aparece demanda. |
| Esfuerzo | S |
| Dependencias | ARQ-001 |

## Supuestos y preguntas abiertas

- **Supuesto (P1):** ≤5 empresas reales y pocas aceptaciones; por eso PRO-001/002 son "altas" por lo que pueden costar en la primera disputa, no por frecuencia.
- **Supuesto (P2):** los tres objetivos (captar, operar, cobrar) pesan igual; si "cobrar" manda, PRO-002 y PRO-003 van primero; si "captar", PRO-006 y PRO-009.
- **Supuesto (P3):** basta adjuntar comprobantes emitidos fuera (SUNAT/RHE); emitir desde el sistema queda fuera.
- **Supuesto (P4):** nombre + DNI es aceptable para los montos actuales; PRO-007 propone lo barato (copia al cliente y rótulo), no firma electrónica.
- **Pregunta abierta (P5):** ¿algún cliente autorizaría aparecer en el portafolio? Sin eso, PRO-006 se reduce a cargar el catálogo.
- **Pregunta abierta (P14):** ¿hay o habrá colaboradores este trimestre? Decide si PRO-004 entra ahora.
- **Pregunta abierta:** ¿cuántas cotizaciones en USD y cuántos equipos no Windows hay en producción? (PRO-011).
- **Pregunta abierta:** ¿cuál es el servicio que más factura (soporte por equipo, mantenimientos mensuales, proyectos de desarrollo)? Decide si la recurrencia de PRO-005 es prioritaria.
- **No verificable desde el repo:** catálogo real en producción, si hay cobros sueltos o cotizaciones aceptadas sin trabajo activo (PRO-002), uso real del workspace (`ultimo_ingreso`).
