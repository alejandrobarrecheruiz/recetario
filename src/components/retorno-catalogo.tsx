"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Posicion = { ruta: string; y: number };
const Contexto = createContext<{ ruta: string | null; recordar: (posicion: Posicion) => void; recuperar: (ruta: string) => number | null } | null>(null);

/** Memoria del recorrido público, aislada por sesión; no persiste la preparación. */
export function RetornoCatalogoProvider({ children }: { children: ReactNode }) {
  const posicion = useRef<Posicion | null>(null);
  const [ruta, setRuta] = useState<string | null>(null);
  const recordar = useCallback((actual: Posicion) => { posicion.current = actual; setRuta(actual.ruta); }, []);
  const recuperar = useCallback((destino: string) => posicion.current?.ruta === destino ? posicion.current.y : null, []);
  const valor = useMemo(() => ({ ruta, recordar, recuperar }), [ruta, recordar, recuperar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRutaCatalogo() { return useContext(Contexto)?.ruta ?? null; }

export function RecordarCatalogo({ ruta, children }: { ruta: string; children: ReactNode }) {
  const contexto = useContext(Contexto);
  const recuperar = contexto?.recuperar;
  useEffect(() => {
    const y = recuperar?.(ruta);
    if (y == null) return;
    const cuadro = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    return () => cancelAnimationFrame(cuadro);
  }, [ruta, recuperar]);
  return <div onClickCapture={evento => {
    const enlace = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (enlace?.origin === window.location.origin && enlace.pathname.startsWith("/recetas/")) {
      contexto?.recordar({ ruta, y: window.scrollY });
    }
  }}>{children}</div>;
}
