"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Capa de fondo con parallax suave: se desplaza a una fracción `factor` del
 * scroll. Pensada para las fotos a sangre de las cubiertas; el contenedor
 * padre recorta con overflow-hidden. Sin JS o con prefers-reduced-motion la
 * capa se queda quieta, que es un fondo normal.
 */
export function CapaParallax({
  factor = 0.2,
  className,
  children,
}: {
  factor?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elemento = ref.current;
    if (!elemento) return;
    // La posicion base se mide una vez, antes de aplicar transformaciones.
    const base = elemento.getBoundingClientRect().top + window.scrollY;
    const alDesplazar = () => {
      elemento.style.transform = `translateY(${(window.scrollY - base) * factor}px)`;
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    alDesplazar();
    return () => window.removeEventListener("scroll", alDesplazar);
  }, [factor]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
