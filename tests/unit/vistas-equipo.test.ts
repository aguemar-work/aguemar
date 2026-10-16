import { describe, expect, it } from "vitest";
import { selectParaEquipo } from "@/lib/datos/vistas-equipo";

describe("selectParaEquipo", () => {
  it("lleva clientes y trabajos a sus vistas conservando el nombre", () => {
    expect(selectParaEquipo("*, clientes(id, nombre), trabajo_tareas(hecha)")).toBe("*, clientes:clientes_equipo(id, nombre), trabajo_tareas(hecha)");
    expect(selectParaEquipo("id, clientes(id, nombre, slug), trabajos(id, titulo)")).toBe("id, clientes:clientes_equipo(id, nombre, slug), trabajos:trabajos_equipo(id, titulo)");
  });

  it("respeta modificadores como !inner", () => {
    expect(selectParaEquipo("id, clientes!inner(nombre)")).toBe("id, clientes:clientes_equipo!inner(nombre)");
  });

  it("no toca otras relaciones ni columnas con nombres parecidos", () => {
    expect(selectParaEquipo("*, trabajo_tareas(*), trabajo_etapas(id)")).toBe("*, trabajo_tareas(*), trabajo_etapas(id)");
    expect(selectParaEquipo("id, cliente_id, trabajo_id")).toBe("id, cliente_id, trabajo_id");
    expect(selectParaEquipo("*")).toBe("*");
  });
});
