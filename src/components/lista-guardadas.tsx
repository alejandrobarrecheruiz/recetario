"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconoGuardar } from "@/components/icono-guardar";
import { TarjetaReceta } from "@/components/tarjeta-receta";
import type { RecetaGuardada } from "@/lib/guardadas";

/** Tarjetas compartidas, eliminación optimista y restitución en su orden original. */
export function ListaGuardadas({ iniciales, esAdmin }: { iniciales: RecetaGuardada[]; esAdmin: boolean }) {
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const lista = iniciales.filter(receta => !ocultas.has(receta.recetaId));
  const pendientes = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const enlaces = useRef(new Map<string, HTMLAnchorElement>());
  const explorar = useRef<HTMLAnchorElement>(null);
  const siguienteFoco = useRef<string | null>(null);

  useEffect(() => {
    const destino = siguienteFoco.current;
    if (destino === null) return;
    (destino === "vacia" ? explorar.current : enlaces.current.get(destino))?.focus();
    siguienteFoco.current = null;
  }, [ocultas]);

  async function quitar(recetaId: string, moverFoco: boolean) {
    if (pendientes.current.has(recetaId)) return;
    const indice = lista.findIndex(elemento => elemento.recetaId === recetaId);
    if (indice < 0) return;
    pendientes.current.add(recetaId);
    if (moverFoco) siguienteFoco.current = (lista[indice + 1] ?? lista[indice - 1])?.recetaId ?? "vacia";
    setError(null);
    setOcultas(actual => new Set(actual).add(recetaId));
    try {
      const respuesta = await fetch(`/api/guardadas/${recetaId}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error("No se pudo quitar la receta.");
      router.refresh();
    } catch {
      setOcultas(actual => { const copia = new Set(actual); copia.delete(recetaId); return copia; });
      setError("No se pudo quitar la receta. Vuelve a intentarlo.");
    } finally { pendientes.current.delete(recetaId); }
  }

  return <section aria-labelledby="titulo-guardadas">
    <div className="cuenta-guardadas-cabecera">
      <h2 id="titulo-guardadas"><IconoGuardar />Guardadas <span aria-live="polite" aria-atomic="true"><span className="sr-only">Recetas guardadas: </span>{lista.length}</span></h2>
      {esAdmin && <Link href="/admin" className="cuenta-panel" aria-label="Ir al panel de administración"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 4H4v16h16v-8M13 11l7-7m-6 0h6v6" /></svg>Panel</Link>}
    </div>
    {error && <p role="alert" className="mb-5 text-sm text-acento">{error}</p>}
    {lista.length === 0 ? <div className="cuenta-vacia">
      <IconoGuardar /><h3>Aún no has guardado ninguna.</h3>
      <p>Toca el marcador de una receta para tenerla aquí.</p>
      <Link ref={explorar} href="/recetas" className="cuenta-boton">Explorar recetas <span aria-hidden="true">→</span></Link>
    </div> : <ul className="rejilla-recetas cuenta-rejilla">
      {lista.map(({ recetaId, receta, foto }) => <li key={recetaId}>
        <TarjetaReceta receta={receta} foto={foto} guardada haySesion volverA="/cuenta" nivelTitulo={3}
          enlaceRef={elemento => { if (elemento) enlaces.current.set(recetaId, elemento); else enlaces.current.delete(recetaId); }}
          accionGuardar={<button type="button" onClick={evento => quitar(recetaId, document.activeElement === evento.currentTarget)} aria-label={`Quitar «${receta.titulo}» de guardadas`} title="Quitar de guardadas" className={`cuenta-quitar${foto ? " cuenta-quitar-con-fondo" : ""}`}><IconoGuardar marcado /></button>} />
      </li>)}
    </ul>}
  </section>;
}
