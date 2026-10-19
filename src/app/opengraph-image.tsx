import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "aguemar · Especialista TI y Desarrollador Frontend";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen para compartir la landing (WhatsApp, LinkedIn, etc.), con la identidad de la marca. */
export default function Imagen() {
  const fuentes = path.join(process.cwd(), "src", "lib", "pdf", "fuentes");
  const logo = readFileSync(path.join(process.cwd(), "public", "logo-light.svg"));
  const logoUri = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0A0F1A", color: "#FFFFFF", padding: 72, fontFamily: "Sora" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUri} alt="" height={64} width={Math.round((64 * 12720) / 5835)} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 96, height: 4, background: "#1CE783", marginBottom: 24 }} />
          <div style={{ fontFamily: "Mono", fontSize: 28, color: "#1CE783" }}>{"// simplificando procesos, ideas e interfaces"}</div>
          {/* Mismo titular que el h1 de la landing. Satori exige display:flex en todo div con varios hijos. */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20, maxWidth: 980 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>Alejandro Guevara M.</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 400, color: "#1CE783", marginTop: 12 }}>Especialista TI y Desarrollador Frontend</div>
          </div>
          <div style={{ fontFamily: "Mono", fontSize: 26, color: "#AEB6C4", marginTop: 28 }}>aguemar.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sora", data: readFileSync(path.join(fuentes, "Sora_700Bold.ttf")), weight: 700, style: "normal" },
        { name: "Sora", data: readFileSync(path.join(fuentes, "Sora_400Regular.ttf")), weight: 400, style: "normal" },
        { name: "Mono", data: readFileSync(path.join(fuentes, "JetBrainsMono_400Regular.ttf")), weight: 400, style: "normal" },
      ],
    },
  );
}
