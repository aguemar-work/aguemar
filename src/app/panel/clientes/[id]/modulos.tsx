"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FASE_ACTUAL, MODULOS, type ClaveModulo } from "@/lib/modulos";
import { actualizarModulosEmpresa } from "../acciones";

export function ModulosEmpresa({ clienteId, modulos }: { clienteId: string; modulos: string[] }) {
  const [pendiente, iniciar] = useTransition();

  const alternar = (clave: ClaveModulo, activo: boolean) =>
    iniciar(async () => {
      const nuevos = activo ? [...modulos.filter((m) => m !== clave), clave] : modulos.filter((m) => m !== clave);
      const r = await actualizarModulosEmpresa(clienteId, nuevos as ClaveModulo[]);
      if (!r.ok) toast.error(r.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulos del workspace</CardTitle>
        <CardDescription>Lo que esta empresa ve al entrar. El inicio siempre está.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {MODULOS.map((m) => {
            const activo = modulos.includes(m.clave);
            const disponible = m.fase <= FASE_ACTUAL;
            return (
              <li key={m.clave} className="flex items-center gap-3 py-3">
                <m.icono className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {m.etiqueta}
                    {!disponible ? (
                      <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                        fase {m.fase}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.descripcion}</p>
                </div>
                <Switch checked={activo} onCheckedChange={(v) => alternar(m.clave, v)} disabled={pendiente} aria-label={`Activar ${m.etiqueta}`} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
