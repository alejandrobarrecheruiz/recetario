import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { NavegacionPublica } from "@/components/navegacion-publica";

/** Navegación compartida; Logo ya es un enlace y no debe envolverse en otro. */
export function CabeceraPublica({ children, navegacion = true }: {
  children?: ReactNode;
  navegacion?: boolean;
}) {
  return (
    <header className="cabecera-publica">
      <a href="#contenido" className="saltar-contenido">Saltar al contenido</a>
      <div className="cabecera-publica-interior">
        <Logo tamano={44} />
        <div className="flex shrink-0 items-center gap-2">
          {navegacion && <NavegacionPublica />}
          {children}
        </div>
      </div>
    </header>
  );
}
