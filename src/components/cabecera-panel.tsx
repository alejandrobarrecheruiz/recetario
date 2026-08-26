import Link from "next/link";
import { BotonSalir } from "@/components/boton-salir";
import { Logo } from "@/components/logo";

/** Cabecera compartida del listado y el alta del panel. El editor no la usa:
 * ocupa la pantalla con su propia barra. El logo lleva a la portada: es la
 * salida del panel sin tocar la URL. */
export function CabeceraPanel() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-tinta/15 pb-5">
      <span className="flex items-center gap-3.5">
        <Logo tamano={48} />
        <Link href="/admin" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-tinta">
          <span className="font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-[-0.03em]">
            Panel
          </span>
          <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-tinta/45">
            Mi libro de recetas
          </span>
        </Link>
      </span>
      <BotonSalir />
    </header>
  );
}
