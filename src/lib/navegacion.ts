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

/**
 * Misma idea para cualquier salto a otra página justo después de una acción que revalida (p. ej. volver a
 * la lista tras eliminar): con el router tardaba 8–9 s en el build de producción y el CI lo daba por colgado.
 */
export const irTrasAccion = abrirCreado;

/*
 * La acción que precede a `irTrasAccion` no debe revalidar rutas (ver los `eliminarX` de cada módulo). Si
 * revalida, Next refresca la ruta actual; cuando esa ruta es el detalle recién borrado abierto en el panel
 * lateral, el refresco de ese segmento responde 404 y el router hace una navegación completa a esa URL
 * (`fetch-server-response`: una respuesta que no es 200 se trata como navegación MPA), que cancela la carga
 * de la lista iniciada aquí. Medido contra `next start` el 23/10/2026. La carga completa ya deja todo fresco.
 */
