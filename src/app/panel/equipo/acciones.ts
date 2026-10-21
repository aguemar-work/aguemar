"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { enlaceInvitacion } from "@/lib/invitaciones";
import { avisarInvitacion } from "@/lib/correo/avisos";
import {
  actualizarColaboradorSchema,
  invitarColaboradorSchema,
  type ActualizarColaboradorInput,
  type InvitarColaboradorInput,
} from "@/lib/validators/empresa";

const RUTA = "/panel/equipo";

/** Invita a un colaborador con las empresas que trabajará. Al aceptar, entra al panel reducido. */
export async function invitarColaborador(input: InvitarColaboradorInput): Promise<Resultado<{ enlace: string }>> {
  const parsed = invitarColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  return accion("equipo.invitarColaborador", async () => {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    // Una invitación pendiente por correo: la anterior se anula.
    await db.from("invitaciones").update({ revocada: true }).eq("tipo", "colaborador").eq("correo", parsed.data.correo).is("usada_en", null);
    const { data, error } = await db
      .from("invitaciones")
      .insert([{ owner_id: usuario.id, tipo: "colaborador", correo: parsed.data.correo, nombre: parsed.data.nombre, empresas: parsed.data.empresas }])
      .select("token")
      .single();
    if (error) throw error;
    const enlace = enlaceInvitacion((data as { token: string }).token);
    avisarInvitacion({ correo: parsed.data.correo, enlace, tipo: "colaborador", nombre: parsed.data.nombre });
    revalidatePath(RUTA);
    return exito({ enlace });
  });
}

/** Cambia las empresas asignadas o desactiva al colaborador (desactivado, no ve nada al instante). */
export async function actualizarColaborador(usuarioId: string, input: ActualizarColaboradorInput): Promise<Resultado<void>> {
  const parsed = actualizarColaboradorSchema.safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa los datos.");
  return accion("equipo.actualizarColaborador", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.rpc("equipo_actualizar", { p_usuario: usuarioId, p_activo: parsed.data.activo, p_empresas: parsed.data.empresas });
    if (error) throw error;
    revalidatePath(RUTA);
    return exito(undefined);
  });
}
