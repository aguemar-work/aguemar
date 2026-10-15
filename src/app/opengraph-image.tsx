import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "agueMar · Diseño, desarrollo y soporte técnico";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen para compartir la landing (WhatsApp, LinkedIn, etc.), con la identidad de la marca. */
export default function Imagen() {
  const fuentes = path.join(process.cwd(), "src", "lib", "pdf", "fuentes");
  const logo = readFileSync(path.join(process.cwd(), "public", "logo-light.svg"));
  const logoUri = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0A0F1A", color: "#FFFFFF", padding: 72, fontFamily: "Sora", position: "relative" }}>
        <svg viewBox="0 0 200 120" width="560" height="336" style={{ position: "absolute", right: -40, top: -20, opacity: 0.12 }}>
          <path d="M70 10 L18 60 L70 110" stroke="#1CE783" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M130 10 L182 60 L130 110" stroke="#1CE783" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUri} alt="" height={64} width={Math.round((64 * 12720) / 5835)} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Mono", fontSize: 28, color: "#1CE783" }}>{"// diseño · desarrollo · soporte técnico"}</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, marginTop: 20, maxWidth: 940 }}>Tu marca, tu web y tus equipos, en buenas manos.</div>
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
