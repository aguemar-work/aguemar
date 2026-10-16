# Plan de correcciones y evolución — agueMar Studio

> Elaborado el 16/10/2026 a partir de `AUDITORIA.md` (commit `c81d9b4`) y de la visión de negocio de Alejandro.
> Cada fase termina como las anteriores: tipos, lint, tests y build limpios, revisión en escritorio y móvil, resumen y commit.

## 0. Lo que ya verifiqué en la base (solo lectura)

| Pregunta de la auditoría (§10) | Resultado | Consecuencia |
|---|---|---|
| ¿Hay más de un `perfil_marca`? | **1 fila**, la tuya (creada el 13/10/2026) | SEG-01 no ha sido explotado; el arreglo es preventivo pero sigue siendo el más importante |
| ¿`anon` puede ejecutar funciones `ws_*`? | **No.** Solo `crear_lead`, `landing_datos` y `portal_documento` (las públicas por diseño) | SEG-07 no es explotable hoy; se cierra igual con `revoke` explícito para funciones futuras |
| ¿La CLI de InsForge tiene ramas de base? | **Sí** (`insforge branch create/switch/merge/reset`) | Staging sin crear otro proyecto (DEV-01) |
| `.github/workflows/ci.yml` | Ya existe en disco, sin commitear | Fase 12 lo commitea y lo activa |

Pendientes que solo tú puedes mirar: registro abierto en InsForge (Auth), variables en Vercel (`NEXT_PUBLIC_SITE_URL`, `RESEND_*`, si está cargada `INSFORGE_API_KEY`), dominio verificado en Resend, backups del proyecto.

## 1. Decisiones de arquitectura (con la visión de negocio)

Tu visión encaja casi entera en lo que ya existe. Lo que falta es **un modelo de roles explícito en la base**, que además es la causa raíz de los tres hallazgos graves de la auditoría (SEG-01, SEG-02, ARQ-01). Se resuelve una sola vez y sirve para los colaboradores.

### 1.1 Roles

| Rol | Quién | Dónde entra | Qué ve |
|---|---|---|---|
| **Propietario** | tú | `/panel` | todo |
| **Colaborador** (nuevo, punto 5 de tu idea) | las personas que te apoyan | `/panel` con navegación reducida | solo las empresas que le asignes: trabajos, etapas, tareas, actividades, comentarios, fichas, informes, briefs y actas. **Nunca** cotizaciones, cobros, montos, leads, Mi marca ni accesos |
| **Empresa** | un usuario por empresa cliente | `/w/[slug]` | lo que digan sus módulos (ya existe) |
| **Sin cuenta** | un cliente puntual | `/d/[token]` | el documento compartido por enlace (ya existe) |

Técnicamente: tabla `miembros (user_id, rol propietario|colaborador, nombre, activo)` y tabla `miembro_empresas (user_id, cliente_id)`; funciones `es_propietario()` y `es_miembro()`. Toda política RLS pasa a exigir ser miembro; el "dueño público" de la landing y de los leads es el propietario registrado, no "el perfil más antiguo". Los datos siguen con `owner_id` = tu uid (el estudio); un trigger lo fija y lo protege, de modo que lo que cree un colaborador también es tuyo.

### 1.2 Tu duda del punto 3 (qué ve cada cliente)

No hace falta decidir "documentos sí o no" por cliente: ya existen tres niveles y solo falta hacerlos evidentes.

| Caso de tu ejemplo | Nivel | Cómo se hace |
|---|---|---|
| Me pide una cotización | **Enlace público** (`/d/[token]`) | Sin cuenta. Ve la cotización, la acepta con nombre y DNI. Hoy ya funciona |
| Acepta soporte técnico | **Acceso "Soporte"** | Usuario de empresa con módulos `documentos`, `cotizaciones`, `equipos`. Ve cotización, ficha técnica, cobros y comprobante |
| Acepta desarrollo/diseño | **Acceso "Proyecto"** | Módulos `proyectos`, `calendario`, `informes`, `documentos`, `solicitudes` |
| Contacto directo, reuniones, revisión | **Acceso "Completo"** | Todos los módulos |

Propongo añadir en la ficha de empresa tres **perfiles de acceso** (Soporte, Proyecto, Completo) que activan los módulos de un clic, y seguir pudiendo ajustarlos uno a uno.

### 1.3 Lo que tu idea pide y hoy no existe

- **Comprobantes** (factura o recibo por honorarios): hoy hay cobros con medio y referencia, pero no se adjunta el comprobante. Falta: archivo PDF en Storage ligado al cobro, visible en el workspace y en el portal.
- **Portafolio** en la landing: hoy solo hay servicios. Falta: marcar trabajos como "de portafolio" con imagen y texto público, y una sección (o página) de portafolio.
- **Colaboradores**: descrito arriba.

## 2. Fases

### Fase 12 · Red de seguridad y correcciones sin base — ≈ medio día

Objetivo: que nada llegue a producción sin pasar por CI, y cerrar lo barato que no toca la base.

1. **CI**: commitear `.github/workflows/ci.yml`; scripts `db:migrate` / `db:status` con el binario local (DEV-05); Dependabot. *Tú:* proteger `main` en GitHub exigiendo el check `ci`.
2. **Staging**: rama `staging` en InsForge (`insforge branch create`); `.env.local` y Playwright apuntan a la rama; cuentas de prueba (propietario, empresa A, empresa B) viven solo ahí (DEV-01, DEV-04). Regla nueva en `CLAUDE.md`: toda migración se aplica y prueba en `staging` antes que en producción.
3. **Entorno**: el build falla en producción si `NEXT_PUBLIC_SITE_URL` falta o es localhost (SEO-01); borrar `INSFORGE_API_KEY`, `CRON_SECRET`, `LEADS_NOTIFY_TO` de `env.ts`, `.env.example` y README (COD-01, DEV-04).
4. **Búsqueda**: `patronBusqueda(q)` en los 7 `.or()` con test unitario (SEG-09); helper `ipDe(headers)` único (COD-02).
5. **Accesibilidad**: anillo de foco `mint-ink` en claro y borde de campos ≥ 3:1 (A11Y-01/02); "Saltar al contenido" en panel y workspace (A11Y-03).
6. **Landing**: `datosLanding` lanza error durante la regeneración para no cachear una landing vacía (PER-01); formulario con `dynamic()` y matcher del middleware sin `/` ni `/d` (PER-03).
7. **Errores**: `error.tsx` en `panel/` y `w/[slug]/` que conserven el marco (UX-01).
8. **Privacidad**: página `/privacidad` enlazada desde el formulario y el pie, con los datos legales que falten como `[PENDIENTE: …]` (LEG-01).

Cierra: DEV-01, DEV-02, DEV-04, DEV-05, SEO-01, COD-01, COD-02, SEG-09, A11Y-01/02/03, PER-01, PER-03, UX-01, LEG-01.

### Fase 13 · Modelo de equipo interno y cierre de la base — ≈ 1 a 1,5 días ✅

> Hecha el 16/10/2026. Dos ajustes respecto a lo planeado: `miembro_empresas` se crea en la Fase 14, cuando la usen los colaboradores; y en vez de comprobar el rol en cada Server Action (una ida y vuelta más, ~0,4 s), la RLS es la barrera y `exigirPropietario()` va solo donde la RLS no llega (crear usuarios en InsForge).

Objetivo: que "propietario" exista en la base y que ninguna columna de sistema sea escribible desde fuera. Una migración, probada primero en `staging`.

1. **Migración `miembros`**: tablas `miembros` y `miembro_empresas` (sin acceso por API), `es_propietario()`, `es_miembro()`; se inserta tu usuario como propietario.
2. **Políticas**: reescribir las 105 políticas de las 27 tablas para exigir `es_miembro()` además de `owner_id` (SEG-01, ARQ-01). `aceptaciones` solo lectura para el panel (SEG-11).
3. **Triggers de sistema** en todas las tablas: `created_at` y `owner_id` no los decide el cliente, `updated_at` se fija solo (DAT-01); trigger que protege `clientes.usuario_id` (SEG-02).
4. **Funciones**: `landing_datos`, `crear_lead` y el aviso por correo usan el propietario registrado; `ws_admin_set_password` y `ws_correo_usuario` exigen `es_propietario()` y rechazan como destino a cualquier miembro (SEG-02); `revoke … from anon` explícito en las 9 funciones antiguas (SEG-07); tope global de 30 leads por hora y límites de longitud en SQL (SEG-04); DNI enmascarado en `cotizacion_json` para workspace y portal, completo solo en el panel (SEG-06).
5. **App**: `obtenerRol` consulta `es_propietario()`; `conSesionPropietario()` exigido en todas las Server Actions y Route Handlers del panel (SEG-03); `crearAccesoEmpresa` solo para propietario.
6. **Tests de aislamiento** (TST-01) en `seguridad.spec.ts` contra staging con dos empresas: A no lee lo de B por id, nadie puede insertar en `perfil_marca` ni vincular al propietario a una empresa, portal con token revocado responde 404. Documentar en el README cómo correrlos.

Cierra: SEG-01, SEG-02, SEG-03, SEG-04, SEG-06, SEG-07, SEG-11, ARQ-01, DAT-01, TST-01.

### Fase 14 · Accesos: colaboradores, invitaciones y perfiles — ≈ 2 días

Objetivo: tu punto 5 y una forma segura de dar accesos.

1. **Invitación por enlace** de un solo uso (tabla `invitaciones` con token, caduca en 7 días) para usuarios de empresa y colaboradores: tú ya no inventas ni compartes contraseñas; la persona entra por el enlace, fija su contraseña y cae donde le toca (SEG-08, UX-02). Restablecer contraseña reutiliza el mismo flujo e invalida sesiones (DAT-02).
2. **Colaboradores**: página `/panel/equipo` (invitar, asignar empresas, activar/desactivar); políticas RLS de lectura y escritura acotadas a `miembro_empresas` para trabajos, etapas, tareas, entregables, actividades, comentarios, fichas, informes, briefs y actas; `panel_resumen()` y la Bandeja filtran por sus empresas; navegación del panel según rol.
3. **Perfiles de acceso** Soporte / Proyecto / Completo en la ficha de empresa (sección 1.2).
4. Tests e2e: el colaborador no ve cotizaciones, cobros, leads ni empresas no asignadas.

### Fase 15 · Captación, observabilidad y defensa en profundidad — ≈ 1,5 días

1. Analítica sin cookies (Vercel Web Analytics) con eventos `contacto_enviado` y `whatsapp_click` (CON-01).
2. Lead garantizado: aviso por Telegram como segundo canal (opcional por variable) y tarjeta "leads sin contactar > 24 h" en el inicio del panel (CON-02). Turnstile en el formulario (SEG-04, opción sólida).
3. CSP con nonces y `frame-ancestors 'none'` (SEG-05); límite por IP en `/d/*` vía Vercel Firewall (SEG-11).
4. Sentry y un monitor de uptime sobre `/` y un `/d/<token>` de prueba (DEV-03).
5. `overrides` de `postcss` y plan para Next 16 (SEG-10).

### Fase 16 · Lo que tu idea añade al producto — ≈ 2 días

1. **Comprobantes**: adjuntar PDF (factura o recibo por honorarios) a cada cobro en Storage privado; la empresa lo descarga desde Cotizaciones y cobros; también por el portal del enlace.
2. **Portafolio**: `trabajos.en_portafolio` con imagen, resumen público y enlace; sección en la landing y páginas por servicio con ciudad y `LocalBusiness` (SEO-02).
3. Cobertura de tests, pruebas de las funciones SQL críticas contra staging y cuerpos vigentes en `db/functions/` (ARQ-02, TST-02).

### Dejo fuera, con motivo

- **DAT-03** (migración inicial destructiva): ya está aplicada y registrada; moverla rompería el historial de migraciones. Se documenta como limpieza puntual y se exige plan de reversa en las nuevas.
- **PER-02** (región de InsForge): decisión de infraestructura con coste alto; se mide primero con Speed Insights (Fase 15).
- **LEG-02/03** y **SEG-06 probatorio**: requieren asesoría legal; se deja listo el aviso de privacidad y la verificación de identidad queda como mejora opcional.

## 3. Reglas nuevas para el repo (se añaden a `CLAUDE.md` en la Fase 12)

- Ninguna migración se aplica a producción sin haber pasado por la rama `staging` y por CI.
- Toda política RLS nueva exige `es_miembro()`; toda tabla nueva lleva el trigger de columnas de sistema.
- Toda Server Action del panel pasa por `conSesionPropietario()` (o `conSesionMiembro()` desde la Fase 14).
- Los e2e nunca usan credenciales reales ni la base de producción.
