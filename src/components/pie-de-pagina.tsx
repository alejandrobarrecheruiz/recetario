import Link from "next/link";

/**
 * Solo destinos existentes. La ayuda y las políticas se añadirán al estar listas.
 */
export function PieDePagina() {
  return (
    <footer className="border-t border-raya-clara bg-papel py-6">
      <div className="pagina-catalogo flex items-center justify-end text-sm">
        <Link href="/contacto" className="inline-flex min-h-11 items-center hover:underline underline-offset-4">Contacto</Link>
      </div>
    </footer>
  );
}
