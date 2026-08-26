"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecetaGuardada } from "@/lib/guardadas";

/**
 * La lista de guardadas de la cuenta: miniatura de portada, titulo con enlace
 * y el corazon lleno para quitar en el sitio. Llega ya resuelta del servidor;
 * quitar es optimista (la fila desaparece al toque y vuelve si la API falla).
 */
export function ListaGuardadas({ iniciales }: { iniciales: RecetaGuardada[] }) {
  const [lista, setLista] = useState(iniciales);

  async function quitar(recetaId: string) {
    const previa = lista;
    setLista(previa.filter((receta) => receta.recetaId !== recetaId));
    try {
      const respuesta = await fetch(`/api/guardadas/${recetaId}`, { method: "DELETE" });
      if (!respuesta.ok) setLista(previa);
    } catch {
      setLista(previa);
    }
  }

  if (lista.length === 0) {
    return (
      <p className="max-w-[38ch] text-[15px] leading-relaxed text-tinta/55">
        Aún no has guardado ninguna. El corazón que hay junto a cada receta las
        trae aquí.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {lista.map((receta) => (
        <li key={receta.recetaId} className="flex items-center gap-3.5 border-t border-tinta/10 py-2.5">
          <Link
            href={`/recetas/${receta.slug}`}
            className="flex min-w-0 flex-1 items-center gap-3.5"
          >
            {receta.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receta.fotoUrl}
                alt={receta.fotoAlt}
                className="h-13 w-13 shrink-0 object-cover"
              />
            ) : (
              <span className="rayas-finas h-13 w-13 shrink-0" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-[15.5px]">{receta.titulo}</span>
              <span className="block font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.16em] text-tinta/45">
                {receta.categoria} · {receta.tiempo}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => quitar(receta.recetaId)}
            aria-label={`Quitar «${receta.titulo}» de guardadas`}
            title="Quitar de guardadas"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-acento hover:text-tinta"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20.5C7.2 16.7 3.5 13.5 3.5 9.8 3.5 7.1 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2.1 4.5 4.8 0 3.7-3.7 6.9-8.5 10.7Z" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
