"use client";

import { useState, useTransition } from "react";
import { avisoError } from "@/lib/avisos";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearFechaHora } from "@/lib/format";
import type { Resultado } from "@/lib/datos/resultado";

export interface ComentarioHilo {
  id: string;
  es_propietario: boolean;
  texto: string;
  created_at: string;
}

interface HiloProps {
  comentarios: ComentarioHilo[];
  /** Quién está viendo: alinea sus mensajes a la derecha. */
  vista: "propietario" | "empresa";
  /** Nombre a mostrar del otro lado. */
  nombrePropietario: string;
  nombreEmpresa: string;
  enviar: (texto: string) => Promise<Resultado<unknown>>;
  titulo?: string;
  descripcion?: string;
}

/** Hilo de comentarios entre el propietario y la empresa sobre un elemento. */
export function Hilo({ comentarios, vista, nombrePropietario, nombreEmpresa, enviar, titulo = "Comentarios", descripcion }: HiloProps) {
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    iniciar(async () => {
      const r = await enviar(t);
      if (!r.ok) {
        avisoError(r.error);
        return;
      }
      setTexto("");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4" aria-hidden /> {titulo}
          <span className="font-mono text-xs font-normal text-muted-foreground">({comentarios.length})</span>
        </CardTitle>
        {descripcion ? <CardDescription>{descripcion}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin comentarios todavía. Escribe el primero.</p>
        ) : (
          <ol className="space-y-3">
            {comentarios.map((c) => {
              const propio = (vista === "propietario") === c.es_propietario;
              return (
                <li key={c.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      propio ? "bg-ink text-white dark:bg-mint dark:text-ink" : "bg-soft dark:bg-secondary"
                    }`}
                  >
                    <p className={`mb-1 font-mono text-[11px] ${propio ? "opacity-70" : "text-muted-foreground"}`}>
                      {c.es_propietario ? nombrePropietario : nombreEmpresa} · {formatearFechaHora(c.created_at)}
                    </p>
                    <p className="whitespace-pre-line">{c.texto}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <form onSubmit={onSubmit} className="space-y-2">
          <label htmlFor="nuevo-comentario" className="sr-only">
            Nuevo comentario
          </label>
          <Textarea
            id="nuevo-comentario"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder={vista === "propietario" ? "Responde o deja una nota para la empresa…" : "Escribe tu comentario o pregunta…"}
            maxLength={4000}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="mint" size="sm" disabled={pendiente || !texto.trim()}>
              {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Enviar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
