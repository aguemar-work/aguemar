/**
 * Abre la página de algo recién creado con una carga normal, no con el router de Next.
 *
 * B-01 (`docs/auditoria/98-tareas.md`): en producción, la navegación del cliente a una página
 * grande justo después de una Server Action (el detalle de un trabajo, una cotización…) a veces
 * no llega a pintarse y el formulario se queda en «Guardando…» aunque el registro ya existe.
 * Una carga completa de esa misma página nunca falló. Cuesta una recarga y el aviso de éxito
 * desaparece, pero el elemento nuevo en pantalla ya es la confirmación. Editar no pasa por aquí:
 * cierra el panel o vuelve al detalle, y eso sí funciona.
 */
export function abrirCreado(href: string) {
  window.location.assign(href);
}
