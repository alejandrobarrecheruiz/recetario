"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import Link from "next/link";
import { clavePreparacion, preparacionInicial, reducirPreparacion, type AccionPreparacion, type ConfiguracionPreparacion, type EstadoPreparacion } from "@/lib/preparacion";

type Cambio = { configuracion: ConfiguracionPreparacion; accion: AccionPreparacion };
type Registro = Record<string, EstadoPreparacion>;
type Progreso = { estados: Registro; ultimaClave: string | null };
const ContextoProgreso = createContext<Progreso & { cambiar: (cambio: Cambio) => void } | null>(null);

export function ProgresoCocinaProvider({ children }: { children: ReactNode }) {
  const [progreso, cambiar] = useReducer((progreso: Progreso, { configuracion, accion }: Cambio) => {
    const registro = progreso.estados;
    const clave = clavePreparacion(configuracion);
    // Una edición invalida todo el progreso anterior de esa receta.
    const vigentes = Object.fromEntries(Object.entries(registro).filter(([id]) => !id.startsWith(`${configuracion.recetaId}:`) || id === clave));
    return { estados: { ...vigentes, [clave]: reducirPreparacion(registro[clave] ?? preparacionInicial(configuracion), accion, configuracion) }, ultimaClave: clave };
  }, { estados: {}, ultimaClave: null });
  const valor = useMemo(() => ({ ...progreso, cambiar }), [progreso]);
  return <ContextoProgreso.Provider value={valor}>{children}</ContextoProgreso.Provider>;
}

const ContextoReceta = createContext<ConfiguracionPreparacion | null>(null);
export function PreparacionReceta({ children, ...configuracion }: ConfiguracionPreparacion & { children: ReactNode }) {
  return <ContextoReceta.Provider value={configuracion}>{children}</ContextoReceta.Provider>;
}

export function usePreparacionReceta() {
  const contexto = useContext(ContextoProgreso);
  const configuracion = useContext(ContextoReceta);
  const cambiar = contexto?.cambiar;
  const enviar = useCallback((accion: AccionPreparacion) => {
    if (configuracion) cambiar?.({ configuracion, accion });
  }, [cambiar, configuracion]);
  if (!contexto || !configuracion) throw new Error("La preparación necesita sus proveedores de progreso y receta");
  const estado = contexto.estados[clavePreparacion(configuracion)] ?? preparacionInicial(configuracion);
  return { estado, configuracion, enviar, actual: Math.max(0, configuracion.pasoIds.indexOf(estado.pasoId ?? "")) };
}

/** Solo recibe recetas que la consulta del servidor permite ver ahora. */
export function RetomarPreparacion({ recetas }: { recetas: { recetaId: string; version: string; titulo: string; slug: string }[] }) {
  const contexto = useContext(ContextoProgreso);
  const receta = recetas.find((item) => {
    if (clavePreparacion(item) !== contexto?.ultimaClave) return false;
    const estado = contexto?.estados[clavePreparacion(item)];
    return estado?.iniciada && !estado.terminada;
  });
  if (!receta) return null;
  return (
    <aside className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-tinta/15 py-4">
      <div><p className="text-base">{receta.titulo}</p><p className="mt-1 text-xs text-tinta/65">Preparación en curso en esta pestaña</p></div>
      <Link href={`/recetas/${receta.slug}#preparacion`} className="inline-flex min-h-11 items-center text-sm text-acento underline underline-offset-4">Retomar preparación</Link>
    </aside>
  );
}
