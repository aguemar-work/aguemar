import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Campo, propsCampo } from "@/components/formulario/campo";

describe("Campo", () => {
  it("anuncia los obligatorios con aria-required en el control", () => {
    render(
      <Campo id="nombre" etiqueta="Nombre" requerido>
        <input {...propsCampo("nombre")} />
      </Campo>,
    );
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute("aria-required", "true");
  });

  it("no lo pone en los opcionales y enlaza el error", () => {
    render(
      <Campo id="correo" etiqueta="Correo" error="Escribe un correo válido.">
        <input {...propsCampo("correo", "Escribe un correo válido.")} />
      </Campo>,
    );
    const control = screen.getByLabelText("Correo");
    expect(control).not.toHaveAttribute("aria-required");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAttribute("aria-describedby", "correo-error");
  });
});
