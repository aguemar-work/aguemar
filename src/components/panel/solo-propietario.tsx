import { obtenerRol } from "@/lib/insforge/server";

/** Muestra su contenido solo al propietario (p. ej. botones de eliminar). obtenerRol está en caché por petición. */
export async function SoloPropietario({ children }: { children: React.ReactNode }) {
  const rol = await obtenerRol();
  return rol.tipo === "propietario" ? <>{children}</> : null;
}
