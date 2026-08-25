"use client";

import { Fragment, useEffect, useRef } from "react";

/**
 * La banda oscura de frases que se desplaza con el scroll. Las frases se
 * pintan dos veces para que el bucle no muestre el final. Con
 * prefers-reduced-motion se queda quieta.
 */
export function Marquesina({ frases }: { frases: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elemento = ref.current;
    if (!elemento) return;
    const alDesplazar = () => {
      elemento.style.transform = `translateX(${-((window.scrollY * 0.35) % 1200)}px)`;
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    alDesplazar();
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <section className="overflow-hidden bg-tinta py-4">
      <div
        ref={ref}
        className="flex gap-13 whitespace-nowrap font-[family-name:var(--font-dm-mono)] text-xs uppercase tracking-[0.2em] text-papel/70"
      >
        {[...frases, ...frases].map((frase, indice) => (
          <Fragment key={indice}>
            <span>{frase}</span>
            <span className="text-acento">/</span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
