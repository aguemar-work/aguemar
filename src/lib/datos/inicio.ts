import type { FichaRow, CotizacionRow } from "@/types/database";
import { hoyLima, sumarDias } from "@/lib/format";
import { conSesion } from "./base";

export interface ResumenInicio {
  mes: { inicio: string; fin: string };
  cotizacionesEmitidas: number;
  esperandoRespuesta: number;
  montoAceptado: number;
  fichasEmitidas: number;
  leadsNuevos: number;
  totalClientes: number;
  totalEquipos: number;
  ultimasCotizaciones: (CotizacionRow & { clientes: { nombre: string } | null })[];
  ultimasFichas: (FichaRow & { clientes: { nombre: string } | null; equipos: { modelo: string | null; serie: string } | null })[];
  proximosMantenimientos: (FichaRow & { clientes: { nombre: string; telefono: string | null; correo: string | null } | null; equipos: { modelo: string | null; serie: string } | null })[];
}

export async function resumenInicio(): Promise<ResumenInicio> {
  const { db } = await conSesion();
  const hoy = hoyLima();
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const [a, m] = inicioMes.split("-").map(Number);
  const finMes = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const en30 = sumarDias(hoy, 30);

  const [cotMes, cotEsperando, cotAceptadas, fichasMes, leads, clientes, equipos, ultCot, ultFichas, proximos] =
    await Promise.all([
      db.from("cotizaciones").select("id", { count: "exact", head: true }).gte("fecha", inicioMes).lte("fecha", finMes),
      db.from("cotizaciones").select("id", { count: "exact", head: true }).eq("estado", "enviada"),
      db.from("cotizaciones").select("total").eq("estado", "aceptada").gte("fecha", inicioMes).lte("fecha", finMes),
      db.from("fichas").select("id", { count: "exact", head: true }).gte("fecha", inicioMes).lte("fecha", finMes),
      db.from("leads").select("id", { count: "exact", head: true }).eq("estado", "nuevo"),
      db.from("clientes").select("id", { count: "exact", head: true }),
      db.from("equipos").select("id", { count: "exact", head: true }),
      db.from("cotizaciones").select("*, clientes(nombre)").order("created_at", { ascending: false }).limit(5),
      db.from("fichas").select("*, clientes(nombre), equipos(modelo, serie)").order("created_at", { ascending: false }).limit(5),
      db
        .from("fichas")
        .select("*, clientes(nombre, telefono, correo), equipos(modelo, serie)")
        .gte("proximo_mantenimiento", hoy)
        .lte("proximo_mantenimiento", en30)
        .order("proximo_mantenimiento", { ascending: true })
        .limit(20),
    ]);

  const montoAceptado = ((cotAceptadas.data ?? []) as { total: number }[]).reduce((s, c) => s + (c.total ?? 0), 0);

  return {
    mes: { inicio: inicioMes, fin: finMes },
    cotizacionesEmitidas: cotMes.count ?? 0,
    esperandoRespuesta: cotEsperando.count ?? 0,
    montoAceptado,
    fichasEmitidas: fichasMes.count ?? 0,
    leadsNuevos: leads.count ?? 0,
    totalClientes: clientes.count ?? 0,
    totalEquipos: equipos.count ?? 0,
    ultimasCotizaciones: (ultCot.data ?? []) as ResumenInicio["ultimasCotizaciones"],
    ultimasFichas: (ultFichas.data ?? []) as ResumenInicio["ultimasFichas"],
    proximosMantenimientos: (proximos.data ?? []) as ResumenInicio["proximosMantenimientos"],
  };
}
