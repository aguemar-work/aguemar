"use client";

import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { formatearFecha, hoyLima } from "@/lib/format";
import type { MarcaInput } from "@/lib/validators/marca";

const vacio = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Vista previa en vivo de cómo salen tus datos en los documentos: portada
 * oscura y tarjeta de contacto del cierre. Se actualiza mientras escribes.
 */
export function VistaPreviaMarca({ valores }: { valores: Partial<MarcaInput> }) {
  const nombre = vacio(valores.nombre_comercial) || "agueMar";
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

      {/* Portada */}
      <div className="relative aspect-[210/297] overflow-hidden rounded-lg bg-ink p-6 text-white shadow-sm ring-1 ring-black/5">
        <Brackets className="absolute -right-6 -top-4 w-44 text-mint opacity-[0.12]" />
        <div className="flex h-full flex-col">
          <Logo variante="claro" alto={26} />
          <div className="mt-auto space-y-3">
            <p className="font-mono text-[10px] text-white/70">COTIZACIÓN · COT-{hoyLima().slice(0, 4)}-001 · {formatearFecha(hoyLima())}</p>
            <p className="font-mono text-xs text-mint">{"// desarrollo"}</p>
            <p className="text-xl font-semibold leading-tight">Página web corporativa</p>
            <p className="text-xs leading-relaxed text-white/70">Diseño, desarrollo y puesta en línea del sitio, con panel para actualizar contenidos.</p>
            <span className="inline-flex rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-semibold text-ink">Enviada</span>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-3 text-[10px] text-white/60">
            <span>
              {nombre}
              {ruc ? ` · RUC ${ruc}` : ""}
            </span>
            <span className="font-mono">01 / 03</span>
          </div>
        </div>
      </div>

      {/* Cierre: firma y tarjeta de contacto */}
      <div className="rounded-lg border border-border bg-white p-4 text-ink shadow-sm">
        <p className="font-mono text-[10px] font-semibold text-mint-ink">05 · Conformidad</p>
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
        <div className="mt-4 rounded-md bg-ink p-3 text-[11px] text-white">
          <p className="font-semibold">{nombre}</p>
          {contacto.length ? (
            <p className="mt-1 break-words font-mono text-[10px] text-white/70">{contacto.join(" · ")}</p>
          ) : (
            <p className="mt-1 text-[10px] text-white/50">Agrega teléfono, correo o web para que te contacten.</p>
          )}
        </div>
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
