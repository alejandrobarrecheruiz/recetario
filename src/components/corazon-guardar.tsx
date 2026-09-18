"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconoGuardar } from "@/components/icono-guardar";
import { recordarGuardado } from "@/lib/guardado-pendiente";

/**
 * El marcador de guardar: vacío, y se rellena al tocarlo. Vive junto a cada
 * receta; conserva el nombre del componente para sus consumidores existentes.
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
  /** Fondo blanco para posarse sobre una foto. */
  conFondo?: boolean;
}) {
  const [marcada, setMarcada] = useState(guardada);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const clase = `flex h-11 w-11 items-center justify-center rounded-full ${
    marcada ? "text-acento" : "text-tinta/60 hover:text-tinta"
  } ${conFondo ? "border border-raya-oscura bg-superficie shadow-sm" : ""}`;

  const icono = <IconoGuardar marcado={marcada} />;

  if (!haySesion) {
    return (
      <Link
        href={`/login?volver=${encodeURIComponent(volverA)}`}
        onClick={() => {
          try { recordarGuardado(window.sessionStorage, recetaId, volverA, window.location.origin); }
          catch { /* El enlace al acceso funciona aunque el navegador bloquee almacenamiento. */ }
        }}
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
    setError(null);
    try {
      const respuesta = await fetch(`/api/guardadas/${recetaId}`, {
        method: nueva ? "POST" : "DELETE",
      });
      if (!respuesta.ok) {
        setMarcada(!nueva);
        setError(respuesta.status === 401 ? "Tu sesión ha caducado. Entra de nuevo para guardar." : "No se pudo cambiar. Vuelve a intentarlo.");
      } else {
        router.refresh();
      }
    } catch {
      setMarcada(!nueva);
      setError("No hay conexión. Vuelve a intentarlo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <span className="relative"><button
      type="button"
      onClick={alternar}
      disabled={enviando}
      aria-pressed={marcada}
      aria-label={marcada ? "Quitar de guardadas" : "Guardar receta"}
      title={marcada ? "Quitar de guardadas" : "Guardar receta"}
      className={clase}
    >
      {icono}
    </button>
    {error && <span role="alert" className="absolute right-0 top-full z-50 w-56 rounded bg-papel p-3 text-sm text-acento shadow">{error}</span>}</span>
  );
}
