import Link from "next/link";
import { BotonSalir } from "@/components/boton-salir";
import { Logo } from "@/components/logo";

/** Cabecera compartida del listado y el alta del panel. El editor no la usa:
 * ocupa la pantalla con su propia barra. El logo lleva a la portada: es la
 * salida del panel sin tocar la URL. */
export function CabeceraPanel({ seccion = "recetas" }: { seccion?: "recetas" | "despensa" }) {
  return (
    <header className="cabecera-panel">
      <span className="cabecera-panel-identidad">
        <Logo tamano={44} />
        <Link href="/admin" className="editor-enlace-panel">Panel</Link>
      </span>
      <BotonSalir className="boton-panel boton-panel-secundario" />
      <nav aria-label="Secciones del panel" className="pestanas-despensa panel-pestanas">
        <Link href="/admin" aria-current={seccion === "recetas" ? "page" : undefined}>Recetas</Link>
        <Link href="/admin/despensa" aria-current={seccion === "despensa" ? "page" : undefined}>Despensa</Link>
      </nav>
    </header>
  );
}
