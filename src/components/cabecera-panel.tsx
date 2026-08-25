import Link from "next/link";
import { BotonSalir } from "@/components/boton-salir";

/** Cabecera compartida del listado y el alta del panel. El editor no la usa:
 * ocupa la pantalla con su propia barra. */
export function CabeceraPanel() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-tinta/15 pb-5">
      <Link href="/admin" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-tinta">
        <span className="font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-[-0.03em]">
          Panel
        </span>
        <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/45">
          Mi libro de recetas
        </span>
      </Link>
      <BotonSalir />
    </header>
  );
}
