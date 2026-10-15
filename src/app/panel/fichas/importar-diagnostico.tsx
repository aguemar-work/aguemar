"use client";

import { useState } from "react";
import { AlertTriangle, FileJson, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { interpretarDiagnostico, leerDiagnostico, type DiagnosticoJson, type Interpretacion } from "@/lib/diagnostico";
import { ESTADOS_DIAGNOSTICO, nombreEquipo } from "@/lib/documentos";
import { formatearFechaHora } from "@/lib/format";

export interface OpcionesImportacion {
  diagnostico: boolean;
  indicadores: boolean;
  equipo: boolean;
}

interface Props {
  /** Sin empresa elegida no se puede buscar el equipo por serie. */
  deshabilitado?: boolean;
  onAplicar: (i: Interpretacion, crudo: DiagnosticoJson, opciones: OpcionesImportacion) => void;
}

/** Pegar o subir el JSON de diagnostico-agueMar.ps1, ver qué se va a llenar y aplicarlo a la ficha. */
export function ImportarDiagnostico({ deshabilitado, onAplicar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string>();
  const [lectura, setLectura] = useState<{ i: Interpretacion; crudo: DiagnosticoJson } | null>(null);
  const [opciones, setOpciones] = useState<OpcionesImportacion>({ diagnostico: true, indicadores: true, equipo: true });

  const analizar = (contenido: string) => {
    setError(undefined);
    const r = leerDiagnostico(contenido);
    if (!r.ok) {
      setLectura(null);
      setError(r.error);
      return;
    }
    setLectura({ i: interpretarDiagnostico(r.datos), crudo: r.datos });
  };

  const cerrar = (o: boolean) => {
    setAbierto(o);
    if (!o) {
      setTexto("");
      setLectura(null);
      setError(undefined);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogTrigger asChild>
        <Button type="button" variant="mint" disabled={deshabilitado} title={deshabilitado ? "Elige primero la empresa" : undefined}>
          <FileJson /> Importar diagnóstico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar diagnóstico</DialogTitle>
          <DialogDescription>
            Pega el JSON que generó <span className="font-mono">diagnostico-agueMar.ps1</span> (queda en el portapapeles) o sube el archivo del Escritorio.
          </DialogDescription>
        </DialogHeader>

        {!lectura ? (
          <div className="space-y-3">
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} placeholder='{ "version": 1, "herramienta": "diagnostico-agueMar.ps1", … }' className="font-mono text-xs" aria-label="JSON del diagnóstico" />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="mint" onClick={() => analizar(texto)} disabled={!texto.trim()}>
                Analizar
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-soft/70 dark:hover:bg-secondary/40">
                <Upload className="size-4" aria-hidden /> Subir archivo .json
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={async (e) => {
                    const archivo = e.target.files?.[0];
                    if (!archivo) return;
                    const contenido = await archivo.text();
                    setTexto(contenido);
                    analizar(contenido);
                  }}
                />
              </label>
              <a href="/diagnostico-agueMar.ps1" download className="text-sm text-muted-foreground underline underline-offset-4">
                Descargar el script
              </a>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-md bg-soft p-3 dark:bg-secondary/50">
              <p className="font-medium">{nombreEquipo(lectura.i.equipo)}</p>
              <p className="text-xs text-muted-foreground">
                {[lectura.i.equipo.procesador, lectura.i.equipo.ram, lectura.i.equipo.sistema_operativo].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">Diagnóstico del {formatearFechaHora(lectura.i.generado)}</p>
            </div>

            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {lectura.i.diagnosticos.map((d, i) => {
                const e = ESTADOS_DIAGNOSTICO.find((x) => x.valor === d.estado)!;
                return (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="font-medium">{d.elemento}</span> <span className="text-muted-foreground">· {d.resultado}</span>
                    </span>
                    <Badge variant={e.variant} className="shrink-0">
                      {e.etiqueta}
                    </Badge>
                  </li>
                );
              })}
            </ul>

            {lectura.i.avisos.length ? (
              <div className="space-y-1 rounded-md bg-warning-bg p-3 text-warning-foreground">
                {lectura.i.avisos.map((a) => (
                  <p key={a} className="flex gap-2 text-xs">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a}
                  </p>
                ))}
              </div>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="mb-1 font-medium">Qué aplicar</legend>
              {(
                [
                  ["equipo", "Datos del equipo (se busca por serie; si no existe, se crea)"],
                  ["diagnostico", `Diagnóstico inicial (${lectura.i.diagnosticos.length} filas, reemplaza las actuales)`],
                  ["indicadores", `Indicadores de portada (${lectura.i.indicadores.length})`],
                ] as const
              ).map(([clave, texto]) => (
                <label key={clave} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-mint-ink dark:accent-mint"
                    checked={opciones[clave]}
                    onChange={(e) => setOpciones({ ...opciones, [clave]: e.target.checked })}
                  />
                  {texto}
                </label>
              ))}
            </fieldset>
          </div>
        )}

        {lectura ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLectura(null)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="mint"
              onClick={() => {
                onAplicar(lectura.i, lectura.crudo, opciones);
                cerrar(false);
              }}
            >
              Aplicar a la ficha
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
