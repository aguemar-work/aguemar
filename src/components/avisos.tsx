import { Toaster } from "sonner";

/**
 * Avisos emergentes (sonner). No van en el layout raíz: la landing no los usa y así no cargan en su
 * primer HTML. Los montan los layouts de panel y workspace y el portal /d. Con botón de cerrar y
 * 6 s de duración (los errores que guardan datos piden más, ver A11Y-004).
 */
export function Avisos() {
  return <Toaster richColors position="top-center" closeButton duration={6000} />;
}
