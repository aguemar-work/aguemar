import { beforeEach, describe, expect, it, vi } from "vitest";

const capturas = vi.hoisted(() => [] as { error: unknown; tags: Record<string, string> }[]);
vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown, opciones?: { tags?: Record<string, string> }) => capturas.push({ error, tags: opciones?.tags ?? {} }),
}));

import { accion, exito, fallo, SinPermisoError } from "@/lib/datos/resultado";

beforeEach(() => {
  capturas.length = 0;
});

describe("accion()", () => {
  it("devuelve tal cual lo que devuelve la acción, sea éxito o un fallo esperado", async () => {
    expect(await accion("prueba.ok", async () => exito({ id: "1" }))).toEqual({ ok: true, data: { id: "1" } });
    expect(await accion("prueba.fallo", async () => fallo<never>("Falta el nombre.", "nombre"))).toEqual({ ok: false, error: "Falta el nombre.", campo: "nombre" });
    expect(capturas).toHaveLength(0);
  });

  it("traduce los errores conocidos y no los manda a Sentry", async () => {
    const duplicado = await accion("prueba.duplicado", async () => {
      throw { code: "23505", message: 'duplicate key value violates unique constraint "clientes_owner_doc_idx"' };
    });
    expect(duplicado).toEqual({ ok: false, error: "Ya existe un cliente con ese número de documento.", campo: undefined });

    const sinPermiso = await accion("prueba.permiso", async () => {
      throw new SinPermisoError();
    });
    expect(sinPermiso.ok === false && sinPermiso.error).toBe("Solo el propietario puede hacer esto.");
    expect(capturas).toHaveLength(0);
  });

  it("un error inesperado llega a Sentry con la acción que falló y la persona solo ve una referencia", async () => {
    const error = { code: "42P01", message: 'relation "clientes_x" does not exist' };
    const r = await accion("cotizaciones.guardarCotizacion", async () => {
      throw error;
    });
    expect(r.ok).toBe(false);
    const mensaje = r.ok === false ? r.error : "";
    expect(mensaje).not.toContain("relation");
    expect(mensaje).toMatch(/referencia ([0-9a-f]{6})/);
    expect(capturas).toHaveLength(1);
    expect(capturas[0].error).toBe(error);
    expect(capturas[0].tags.accion).toBe("cotizaciones.guardarCotizacion");
    // La referencia que ve la persona es la misma que queda en Sentry.
    expect(mensaje).toContain(capturas[0].tags.ref);
  });
});
