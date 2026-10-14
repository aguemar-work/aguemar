"use client";

import { useState } from "react";
import { Menu, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/panel/theme-toggle";
import { NavWorkspace } from "./nav-workspace";

interface Props {
  slug: string;
  nombreEmpresa: string;
  modulos: string[];
  correo?: string | null;
  cerrarSesion: () => Promise<void>;
}

export function TopbarWorkspace({ slug, nombreEmpresa, modulos, correo, cerrarSesion }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menú del workspace</SheetTitle>
          <NavWorkspace slug={slug} nombreEmpresa={nombreEmpresa} modulos={modulos} onNavegar={() => setAbierto(false)} />
        </SheetContent>
      </Sheet>
      <p className="truncate text-sm font-medium md:hidden">{nombreEmpresa}</p>
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Cuenta">
            <UserRound className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="truncate font-mono">{correo ?? nombreEmpresa}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void cerrarSesion()}>
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
