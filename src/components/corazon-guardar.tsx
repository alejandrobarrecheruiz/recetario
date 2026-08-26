"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * El corazon de guardar: vacio, y se rellena al tocarlo. Vive junto a cada
 * receta (cabecera de la ficha y tarjetas de la rejilla).
 *
 * Sin sesion no alterna: lleva a /login con ?volver= a donde estabas. El
 * estado es optimista (se pinta al momento y se revierte si la API falla); la
 * verdad vive en la coleccion `saves` del servidor.
 */
export function CorazonGuardar({
  recetaId,
  guardada,
  haySesion,
  volverA,
  conFondo = false,
}: {
  recetaId: string;
  guardada: boolean;
  haySesion: boolean;
  /** Ruta interna a la que volver tras entrar, si no habia sesion. */
  volverA: string;
  /** Fondo translucido para posarse sobre una foto. */
  conFondo?: boolean;
}) {
  const [marcada, setMarcada] = useState(guardada);
  const [enviando, setEnviando] = useState(false);

  const clase = `flex h-11 w-11 items-center justify-center rounded-full ${
    marcada ? "text-acento" : "text-tinta/60 hover:text-tinta"
  } ${conFondo ? "bg-papel/75 backdrop-blur-md" : ""}`;

  const icono = (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill={marcada ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5C7.2 16.7 3.5 13.5 3.5 9.8 3.5 7.1 5.5 5 8 5c1.6 0 3.1.9 4 2.2C12.9 5.9 14.4 5 16 5c2.5 0 4.5 2.1 4.5 4.8 0 3.7-3.7 6.9-8.5 10.7Z" />
    </svg>
  );

  if (!haySesion) {
    return (
      <Link
        href={`/login?volver=${encodeURIComponent(volverA)}`}
        aria-label="Guardar receta (con tu cuenta)"
        title="Guardar receta"
        className={clase}
      >
        {icono}
      </Link>
    );
  }

  async function alternar() {
    if (enviando) return;
    const nueva = !marcada;
    setMarcada(nueva);
    setEnviando(true);
    try {
      const respuesta = await fetch(`/api/guardadas/${recetaId}`, {
        method: nueva ? "POST" : "DELETE",
      });
      if (!respuesta.ok) setMarcada(!nueva);
    } catch {
      setMarcada(!nueva);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={marcada}
      aria-label={marcada ? "Quitar de guardadas" : "Guardar receta"}
      title={marcada ? "Quitar de guardadas" : "Guardar receta"}
      className={clase}
    >
      {icono}
    </button>
  );
}
