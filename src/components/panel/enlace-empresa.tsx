import Link from "@/components/panel/enlace";
import { obtenerRol } from "@/lib/insforge/server";

/**
 * Nombre de la empresa enlazado a su ficha. La ficha de empresa es solo del
 * propietario: al colaborador se le muestra el nombre sin enlace (evita un 404).
 * obtenerRol está en caché por petición, así que no suma idas y vueltas.
 */
export async function EnlaceEmpresa({ id, nombre }: { id: string; nombre: string }) {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") return <>{nombre}</>;
  return (
    <Link href={`/panel/clientes/${id}`} className="underline-offset-4 hover:underline">
      {nombre}
    </Link>
  );
}
