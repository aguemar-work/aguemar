import type { ServicioRow } from "@/types/database";
import { conSesion } from "./base";

export async function listarServicios(): Promise<ServicioRow[]> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("servicios")
    .select("*")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ServicioRow[];
}
