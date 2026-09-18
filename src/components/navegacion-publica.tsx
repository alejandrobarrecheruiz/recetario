"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BuscadorCabecera } from "@/components/buscador-cabecera";

export function NavegacionPublica() {
  const ruta = usePathname();
  return (
    <nav aria-label="Principal" className="navegacion-publica">
      <Link href="/recetas" aria-label="Todas las recetas" aria-current={ruta === "/recetas" ? "page" : undefined} className="icono-cabecera">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
        <span aria-hidden="true" className="ayuda-cabecera">Todas las recetas</span>
      </Link>
      <Suspense fallback={<Link href="/recetas?buscar=1" aria-label="Buscar recetas" className="icono-cabecera"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg></Link>}>
        <BuscadorCabecera />
      </Suspense>
      <Link href="/cuenta" aria-label="Mi cuenta y guardadas" aria-current={ruta === "/cuenta" ? "page" : undefined} className="icono-cabecera">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-4.2 3.2-6 7-6s6.3 1.8 7 6" /></svg>
        <span aria-hidden="true" className="ayuda-cabecera">Mi cuenta y guardadas</span>
      </Link>
    </nav>
  );
}
