import type { ReactNode } from "react";
import { PieDePagina } from "@/components/pie-de-pagina";

// Solo las páginas públicas llevan pie: el panel trabaja a pantalla completa
// y las de cuenta son tarjetas centradas.
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PieDePagina />
    </>
  );
}
