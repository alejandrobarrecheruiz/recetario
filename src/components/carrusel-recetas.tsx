"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

function Flecha({ anterior = false }: { anterior?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={anterior ? "M19 12H5m7 7-7-7 7-7" : "M5 12h14m-7-7 7 7-7 7"} />
  </svg>;
}

/** Las tarjetas se renderizan en el servidor; aquí solo vive el desplazamiento. */
export function CarruselRecetas({ children }: { children: ReactNode }) {
  const id = useId();
  const pista = useRef<HTMLUListElement>(null);
  const [limites, setLimites] = useState({ inicio: true, final: false });

  useEffect(() => {
    const elemento = pista.current;
    if (!elemento) return;
    const actualizar = () => setLimites({
      inicio: elemento.scrollLeft <= 2,
      final: elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 2,
    });
    actualizar();
    elemento.addEventListener("scroll", actualizar, { passive: true });
    const observador = new ResizeObserver(actualizar);
    observador.observe(elemento);
    return () => {
      elemento.removeEventListener("scroll", actualizar);
      observador.disconnect();
    };
  }, [children]);

  function desplazar(direccion: -1 | 1) {
    const elemento = pista.current;
    if (!elemento) return;
    const primera = elemento.children[0];
    const segunda = elemento.children[1];
    const distancia = primera && segunda
      ? segunda.getBoundingClientRect().left - primera.getBoundingClientRect().left
      : elemento.clientWidth;
    elemento.scrollBy({
      left: direccion * distancia,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return <section className="ficha-relacionadas pagina-amplia" aria-labelledby={`${id}-titulo`}>
    <div className="carrusel-cabecera">
      <h2 id={`${id}-titulo`}>Sigue por aquí</h2>
      <div className="carrusel-controles">
        <button type="button" aria-label="Ver recetas anteriores" aria-controls={id} disabled={limites.inicio} onClick={() => desplazar(-1)}><Flecha anterior /></button>
        <button type="button" aria-label="Ver recetas siguientes" aria-controls={id} disabled={limites.final} onClick={() => desplazar(1)}><Flecha /></button>
      </div>
    </div>
    <ul ref={pista} id={id} className="carrusel-recetas" role="list" tabIndex={0} aria-label="Recetas recomendadas">
      {children}
      <li className="carrusel-destino">
        <Link href="/recetas" className="carrusel-ver-todas">
          <span>Todas las recetas</span>
          <span className="carrusel-flecha-final"><Flecha /></span>
        </Link>
      </li>
    </ul>
  </section>;
}
