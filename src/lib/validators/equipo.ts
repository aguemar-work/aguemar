import "@/lib/zod-sin-jit";
import { z } from "zod";

const texto = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const equipoSchema = z.object({
  cliente_id: z.string().uuid("Elige un cliente."),
  marca: texto(),
  modelo: texto(),
  serie: z.string().trim().min(1, "Escribe el número de serie.").max(100),
  sistema_operativo: texto(),
  procesador: texto(),
  ram: texto(100),
  almacenamiento: texto(),
  grafica: texto(),
  bateria: texto(),
  bios: texto(),
  notas: texto(2000),
});

export type EquipoInput = z.input<typeof equipoSchema>;
export type EquipoDatos = z.output<typeof equipoSchema>;
