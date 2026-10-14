import { cache } from "react";
import type { PerfilMarcaRow, PlantillaChecklistRow } from "@/types/database";
import { conSesion } from "./base";

export const obtenerPerfilMarca = cache(async function obtenerPerfilMarca(): Promise<PerfilMarcaRow | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("perfil_marca").select("*").maybeSingle();
  if (error) throw error;
  return (data as PerfilMarcaRow | null) ?? null;
});

export async function listarPlantillas(): Promise<PlantillaChecklistRow[]> {
  const { db } = await conSesion();
  const { data, error } = await db.from("plantillas_checklist").select("*").order("tipo_servicio");
  if (error) throw error;
  return (data ?? []) as PlantillaChecklistRow[];
}
