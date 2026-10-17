"use client";

import { Logo } from "@/components/brand/logo";
import { formatearFecha, hoyLima } from "@/lib/format";
import type { MarcaInput } from "@/lib/validators/marca";

const vacio = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Vista previa en vivo de cómo salen tus datos en los documentos: cabecera
 * clara de la primera hoja y firmas del cierre. Se actualiza mientras escribes.
 */
export function VistaPreviaMarca({ valores }: { valores: Partial<MarcaInput> }) {
  const nombre = vacio(valores.nombre_comercial) || "aguemar";
  const responsable = vacio(valores.responsable) || "Tu nombre";
  const cargo = vacio(valores.cargo) || "Cargo";
  const contacto = [vacio(valores.telefono), vacio(valores.correo), vacio(valores.web)].filter(Boolean);
  const pagos = [
    ["Cuenta", vacio(valores.pago_cuenta)],
    ["CCI", vacio(valores.pago_cci)],
    ["Yape", vacio(valores.pago_yape)],
    ["Plin", vacio(valores.pago_plin)],
  ].filter(([, v]) => v);
  const ruc = vacio(valores.ruc);

  return (
    <div className="space-y-4" aria-label="Vista previa de tus documentos">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Vista previa · así salen tus documentos</p>

      {/* Cabecera de la primera hoja (los PDF van sin portada) */}
      <div className="rounded-lg border border-border bg-white p-4 text-ink shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
          <Logo variante="oscuro" alto={20} />
          <div className="text-right font-mono leading-tight">
            <p className="text-[9px] tracking-wider text-muted">COTIZACIÓN</p>
            <p className="text-xs font-semibold">COT-{hoyLima().slice(0, 4)}-001</p>
            <p className="text-[10px] text-muted">{formatearFecha(hoyLima())}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 font-mono text-[10px] text-mint-ink">
          {"// desarrollo"}
          <span className="rounded-full bg-mint-soft px-2 py-px font-sans text-[9px] font-semibold">Vigente</span>
        </p>
        <p className="mt-1 text-base font-semibold leading-tight">Página web corporativa</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted">Para</p>
            <p className="font-medium">Empresa cliente</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted">De</p>
            <p className="font-medium">{nombre}</p>
            {ruc ? <p className="font-mono text-[10px]">RUC {ruc}</p> : null}
            <p>{responsable}</p>
          </div>
        </div>
      </div>

      {/* Cierre: firmas y línea de contacto */}
      <div className="rounded-lg border border-border bg-white p-4 text-ink shadow-sm">
        <p className="font-mono text-[10px] font-semibold text-mint-ink">04 · Conformidad</p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[11px]">
          <div className="border-t border-ink/30 pt-1">
            <p className="font-medium">{responsable}</p>
            <p className="text-muted">
              {cargo} · {nombre}
            </p>
          </div>
          <div className="border-t border-ink/30 pt-1">
            <p className="font-medium">Empresa cliente</p>
            <p className="text-muted">Nombre y DNI</p>
          </div>
        </div>
        {contacto.length ? (
          <p className="mt-3 break-words font-mono text-[10px] text-muted">{contacto.join(" · ")}</p>
        ) : (
          <p className="mt-3 text-[10px] text-muted">Agrega teléfono, correo o web para que te contacten.</p>
        )}
        {pagos.length ? (
          <div className="mt-3 rounded-md bg-soft p-3 text-[10px]">
            <p className="mb-1 font-semibold">Datos de pago</p>
            {pagos.map(([k, v]) => (
              <p key={k} className="flex justify-between gap-2">
                <span className="text-muted">{k}</span>
                <span className="font-mono">{v}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
