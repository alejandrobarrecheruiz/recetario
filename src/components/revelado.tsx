"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Entrada en cascada del rediseño: el bloque aparece subiendo cuando entra en
 * el viewport, con un retardo proporcional a `orden`. Los estilos se aplican
 * imperativamente sobre el nodo (sin estado de React): antes de montar el JS
 * el contenido es visible tal cual, y con prefers-reduced-motion no se anima.
 */
export function Revelado({
  orden = 1,
  className,
  children,
}: {
  orden?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const retardo = orden * 90;
    // El primer aviso del observer dice si el bloque YA esta en el viewport
    // (carga con scroll restaurado, anclas): entonces no se toca nada. Solo lo
    // que queda fuera se esconde, y entra animado al llegar a el.
    let primerAviso = true;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (primerAviso) {
            primerAviso = false;
            if (entrada.isIntersecting) {
              observador.disconnect();
              return;
            }
            elemento.style.opacity = "0";
            elemento.style.transform = "translateY(26px)";
            elemento.style.transition = `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${retardo}ms, transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${retardo}ms`;
            continue;
          }
          if (entrada.isIntersecting) {
            elemento.style.opacity = "1";
            elemento.style.transform = "none";
            observador.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [orden]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
