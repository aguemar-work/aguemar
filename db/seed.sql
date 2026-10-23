-- =====================================================================
-- aguemar Studio · seed
-- Crea el perfil de marca, los servicios iniciales, las plantillas de
-- checklist, el cliente SGC, su equipo Lenovo y la ficha FT-2026-001.
--
-- Uso: npm run db:seed -- tu@correo.com
--   (el script reemplaza __OWNER_EMAIL__ y ejecuta este archivo con la CLI
--    de InsForge). El usuario debe existir: inicia sesión una vez en /login.
-- =====================================================================

do $$
declare
  v_owner uuid;
  v_cliente uuid;
  v_equipo uuid;
  v_ficha uuid;
begin
  select id into v_owner from auth.users where email = '__OWNER_EMAIL__';
  if v_owner is null then
    raise exception 'No existe el usuario __OWNER_EMAIL__ en auth.users. Inicia sesión una vez en /login y vuelve a ejecutar el seed.';
  end if;
  if exists (select 1 from public.perfil_marca where owner_id = v_owner) then
    raise exception 'El seed ya se ejecutó para __OWNER_EMAIL__ (existe perfil_marca).';
  end if;

  -- ---------- Mi marca ----------
  insert into public.perfil_marca (owner_id, nombre_comercial, responsable, cargo, ruc, telefono, correo, web, direccion,
                                   igv_pct, moneda_default, validez_dias_default, condiciones_default,
                                   pago_cuenta, pago_cci, pago_yape, pago_plin)
  values (v_owner, 'aguemar', 'Alejandro Fritz Guevara Martínez', 'Soporte técnico',
          '[PENDIENTE: RUC]', '[PENDIENTE: teléfono]', '[PENDIENTE: correo]', '[PENDIENTE: web]', '[PENDIENTE: dirección]',
          1800, 'PEN', 15,
          E'Validez según la fecha indicada.\nForma de pago: 50 % al aceptar y 50 % al entregar, salvo acuerdo distinto.',
          '[PENDIENTE: cuenta]', '[PENDIENTE: CCI]', '[PENDIENTE: Yape]', '[PENDIENTE: Plin]');

  -- ---------- Propietario del estudio (Fase 13): sin esta fila no entra al panel ----------
  insert into public.miembros (user_id, rol, nombre) values (v_owner, 'propietario', 'Alejandro Fritz Guevara Martínez')
  on conflict do nothing;

  -- ---------- Servicios iniciales ([PENDIENTE: confirmar lista y precios]) ----------
  insert into public.servicios (owner_id, area, nombre, descripcion, precio_base, unidad, visible_landing, orden) values
    (v_owner, 'soporte', 'Mantenimiento preventivo', 'Limpieza, integridad del sistema, optimización, actualizaciones y ficha técnica del estado del equipo.', null, 'equipo', true, 1),
    (v_owner, 'soporte', 'Mantenimiento correctivo', 'Diagnóstico y solución de fallas de software o hardware.', null, 'equipo', true, 2),
    (v_owner, 'soporte', 'Soporte remoto', 'Atención en línea para resolver incidencias sin salir de tu oficina.', null, 'hora', true, 3),
    (v_owner, 'soporte', 'Instalación y configuración', 'Sistema operativo, programas, impresoras y periféricos listos para usar.', null, 'servicio', true, 4),
    (v_owner, 'soporte', 'Redes', 'Diseño, cableado y configuración de redes para hogar y oficina.', null, 'servicio', true, 5),
    (v_owner, 'soporte', 'Recuperación de información', 'Recuperación de archivos en discos y unidades con fallas.', null, 'servicio', true, 6);

  -- ---------- Plantillas de checklist ----------
  insert into public.plantillas_checklist (owner_id, tipo_servicio, items) values
    (v_owner, 'Mantenimiento preventivo', '[
      {"titulo": "Respaldo", "detalle": "Copia de seguridad de documentos y perfiles antes de intervenir."},
      {"titulo": "Integridad", "detalle": "DISM, SFC y CHKDSK sin errores."},
      {"titulo": "Limpieza", "detalle": "Archivos temporales, caché y papelera."},
      {"titulo": "Optimización", "detalle": "Inicio, servicios y rendimiento del sistema."},
      {"titulo": "Aplicaciones", "detalle": "Revisión y actualización de aplicaciones instaladas."},
      {"titulo": "Windows Update", "detalle": "Sistema al día con las últimas actualizaciones."},
      {"titulo": "Programas", "detalle": "Desinstalación de software innecesario o duplicado."},
      {"titulo": "Antivirus óptimo", "detalle": "Protección activa y definiciones actualizadas."},
      {"titulo": "Firewall", "detalle": "Firewall activo en todos los perfiles de red."},
      {"titulo": "Eventos del sistema", "detalle": "Revisión de eventos críticos de los últimos 7 días."},
      {"titulo": "Idioma y teclado", "detalle": "Configuración regional y distribución de teclado correctas."},
      {"titulo": "Soporte del fabricante", "detalle": "Controladores y BIOS según el soporte del fabricante."}
    ]'::jsonb),
    (v_owner, 'Mantenimiento correctivo', '[
      {"titulo": "Diagnóstico", "detalle": "Identificación de la causa de la falla."},
      {"titulo": "Respaldo", "detalle": "Copia de seguridad si el caso lo permite."},
      {"titulo": "Corrección", "detalle": "Reparación o reemplazo del componente afectado."},
      {"titulo": "Verificación", "detalle": "Pruebas de funcionamiento tras la corrección."}
    ]'::jsonb),
    (v_owner, 'Soporte remoto', '[
      {"titulo": "Conexión", "detalle": "Sesión remota establecida con autorización del cliente."},
      {"titulo": "Atención", "detalle": "Revisión y solución de las incidencias reportadas."},
      {"titulo": "Cierre", "detalle": "Sesión cerrada y accesos temporales eliminados."}
    ]'::jsonb);

  -- ---------- Cliente de referencia: SGC ----------
  insert into public.clientes (owner_id, nombre, slug, modulos, tipo_doc, num_doc, contacto, telefono, correo, direccion)
  values (v_owner, 'SGC', 'sgc', '{proyectos,calendario,solicitudes,documentos,equipos}', 'RUC', null, '[PENDIENTE: contacto]', '[PENDIENTE: teléfono]', '[PENDIENTE: correo]', '[PENDIENTE: dirección]')
  returning id into v_cliente;

  -- ---------- Equipo: Lenovo 83LT ----------
  insert into public.equipos (owner_id, cliente_id, marca, modelo, serie, sistema_operativo, procesador, ram, almacenamiento, grafica, bateria, bios)
  values (v_owner, v_cliente, 'Lenovo', 'Tipo 83LT', 'PF5Y6DJT', 'Windows 11 Pro 10.0.26200', '[PENDIENTE: procesador]',
          '32 GB', 'SSD Samsung 1 TB (MZAL81T0HFLB)', 'NVIDIA dedicada', 'BYD Li-Po 80 000 mWh', 'RLCN29WW (14/08/2025)')
  returning id into v_equipo;

  -- ---------- Ficha FT-2026-001 ----------
  insert into public.fichas (owner_id, numero, cliente_id, equipo_id, fecha, tipo_servicio, modalidad, titular, resumen, estado_final, indicadores, proximo_mantenimiento)
  values (v_owner, 'FT-2026-001', v_cliente, v_equipo, date '2026-10-09', 'Mantenimiento preventivo', 'remota',
          'Mantenimiento preventivo remoto · Lenovo 83LT',
          'Equipo en óptimas condiciones: sin errores de integridad, disco y batería en excelente estado. Se atendieron las 3 incidencias reportadas.',
          'operativo',
          '[
            {"valor": "0 %", "etiqueta": "desgaste del SSD"},
            {"valor": "99,7 %", "etiqueta": "salud de batería · 392 ciclos"},
            {"valor": "0", "etiqueta": "errores de integridad"},
            {"valor": "3 / 3", "etiqueta": "incidencias atendidas"}
          ]'::jsonb,
          date '2027-04-09')
  returning id into v_ficha;

  -- Reserva el correlativo 001 del 2026 para fichas.
  insert into public.contadores (owner_id, tipo, anio, ultimo) values (v_owner, 'FT', 2026, 1)
  on conflict (owner_id, tipo, anio) do update set ultimo = greatest(public.contadores.ultimo, 1);

  insert into public.ficha_diagnosticos (owner_id, ficha_id, elemento, resultado, estado, orden) values
    (v_owner, v_ficha, 'Integridad del sistema (DISM, SFC, CHKDSK)', '0 errores detectados', 'optimo', 1),
    (v_owner, v_ficha, 'Disco SSD Samsung 1 TB', '0 % de desgaste, sin sectores reasignados', 'optimo', 2),
    (v_owner, v_ficha, 'Batería BYD Li-Po', '99,7 % de capacidad, 392 ciclos', 'optimo', 3),
    (v_owner, v_ficha, 'BIOS', 'RLCN29WW del 14/08/2025, versión vigente', 'optimo', 4),
    (v_owner, v_ficha, 'Eventos críticos (7 días)', 'Sin eventos críticos relevantes', 'optimo', 5),
    (v_owner, v_ficha, 'Microsoft Store / WhatsApp', 'Error 0x80073D02 al actualizar', 'atendido', 6),
    (v_owner, v_ficha, 'Microsoft Office', 'Imágenes no se mostraban en documentos', 'atendido', 7),
    (v_owner, v_ficha, 'Nitro PDF', 'No aceptaba contraseñas', 'atendido', 8);

  insert into public.ficha_trabajos (owner_id, ficha_id, titulo, detalle, hecho, orden)
  select v_owner, v_ficha, i->>'titulo', i->>'detalle', true, (ord)::integer
  from public.plantillas_checklist p,
       jsonb_array_elements(p.items) with ordinality as t(i, ord)
  where p.owner_id = v_owner and p.tipo_servicio = 'Mantenimiento preventivo';

  insert into public.ficha_incidencias (owner_id, ficha_id, titulo, causa, solucion, estado, orden) values
    (v_owner, v_ficha, 'Error 0x80073D02 al actualizar WhatsApp',
     'WhatsApp Beta estaba en uso durante la actualización desde Microsoft Store.',
     'Se cerró la aplicación, se reinició el servicio de Store y se completó la actualización.', 'resuelta', 1),
    (v_owner, v_ficha, 'Imágenes no se mostraban en Office',
     'Opción de visualización de marcadores de posición activa y caché gráfica de Office dañada.',
     'Se desactivó la opción, se limpió la caché y se verificó la visualización en Word y Excel.', 'resuelta', 2),
    (v_owner, v_ficha, 'Nitro PDF no aceptaba contraseñas',
     'La captura de teclado de la sesión remota interfería con el campo de contraseña.',
     'Se indicó ingresar la contraseña localmente y se validó la apertura del documento.', 'resuelta', 3);

  insert into public.ficha_recomendaciones (owner_id, ficha_id, texto, orden) values
    (v_owner, v_ficha, 'Mantener Windows Update activo y reiniciar el equipo al menos una vez por semana.', 1),
    (v_owner, v_ficha, 'Usar la versión estable de WhatsApp en lugar de la Beta para evitar errores de actualización.', 2),
    (v_owner, v_ficha, 'Programar el siguiente mantenimiento preventivo en 6 meses (abril de 2027).', 3),
    (v_owner, v_ficha, 'Conservar entre 20 % y 80 % de carga para prolongar la vida útil de la batería.', 4);
end
$$;
