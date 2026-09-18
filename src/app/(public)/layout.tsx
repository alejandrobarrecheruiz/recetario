import type { ReactNode } from "react";
import { PieDePagina } from "@/components/pie-de-pagina";
import { ProgresoCocinaProvider } from "@/components/progreso-cocina";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";

// Las páginas públicas comparten pie y progreso temporal de cocina.
// Acceso y cuenta tienen su propio layout, sin este estado de preparación.
export default async function LayoutPublico({ children }: { children: ReactNode }) {
  const sesion = await sesionActual();
  const identidad = `${sesion?.user.id ?? "publico"}:${rolDeSesion(sesion?.user.role)}`;
  return (
    <ProgresoCocinaProvider key={identidad}>
      {children}
      <PieDePagina />
    </ProgresoCocinaProvider>
  );
}
