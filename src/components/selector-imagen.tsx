"use client";

import { useRef, useState } from "react";
import { upload } from "@imagekit/next";
import type { Imagen, TipoImagen } from "@/models/imagen";

/**
 * Sube una foto y gestiona la que ya hay. El flujo es el de CLAUDE.md:
 *
 *   1. Pide a /api/imagenes/firma unas credenciales de un solo uso.
 *   2. Sube el fichero DESDE EL NAVEGADOR directo a ImageKit (los bytes no
 *      pasan por nuestras funciones: limite de ~4 MB en Vercel).
 *   3. Registra los metadatos en /api/imagenes y devuelve la Imagen creada.
 *
 * "Quitar" borra de verdad (fichero, metadatos y referencias) via
 * DELETE /api/imagenes/[id]. Para cambiar una foto: quitar y subir otra.
 */
export function SelectorImagen({
  recetaId,
  tipo,
  altPorDefecto,
  imagen,
  onCambio,
}: {
  recetaId: string;
  tipo: TipoImagen;
  altPorDefecto: string;
  imagen: Pick<Imagen, "_id" | "url" | "alt"> | null;
  onCambio: (imagen: Imagen | null) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entradaFichero = useRef<HTMLInputElement>(null);

  async function subir(fichero: File) {
    setError(null);
    setOcupado(true);
    try {
      const respuestaFirma = await fetch("/api/imagenes/firma");
      if (!respuestaFirma.ok) {
        throw new Error("No se pudo obtener la firma de subida.");
      }
      const firma = await respuestaFirma.json();

      const subida = await upload({
        file: fichero,
        fileName: fichero.name,
        token: firma.token,
        signature: firma.signature,
        expire: firma.expire,
        publicKey: firma.publicKey,
        folder: firma.folder,
      });
      if (!subida.fileId || !subida.url || !subida.filePath || !subida.width || !subida.height) {
        throw new Error("ImageKit no devolvio los metadatos de la subida.");
      }

      const respuestaMetadatos = await fetch("/api/imagenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recetaId,
          proveedor: "imagekit",
          fileId: subida.fileId,
          url: subida.url,
          path: subida.filePath,
          alt: altPorDefecto,
          ancho: subida.width,
          alto: subida.height,
          bytes: subida.size ?? 0,
          tipo,
          orden: 0,
        }),
      });
      if (!respuestaMetadatos.ok) {
        const cuerpo = await respuestaMetadatos.json().catch(() => null);
        throw new Error(cuerpo?.error ?? "No se pudieron registrar los metadatos.");
      }

      onCambio(await respuestaMetadatos.json());
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "La subida fallo.");
    } finally {
      setOcupado(false);
      if (entradaFichero.current) entradaFichero.current.value = "";
    }
  }

  async function quitar() {
    if (!imagen) return;
    setError(null);
    setOcupado(true);
    try {
      const respuesta = await fetch(`/api/imagenes/${imagen._id}`, { method: "DELETE" });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(cuerpo?.error ?? "No se pudo borrar la imagen.");
      }
      onCambio(null);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "El borrado fallo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {imagen ? (
        <>
          {/* Miniatura del panel: un img plano basta, aqui no hay que optimizar
              nada. eslint-disable por la regla de next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagen.url}
            alt={imagen.alt}
            className="h-20 w-20 rounded border object-cover"
          />
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            disabled={ocupado}
            onClick={quitar}
          >
            {ocupado ? "Quitando..." : "Quitar foto"}
          </button>
        </>
      ) : (
        <label className="text-xs opacity-80">
          <span className="mr-2">{ocupado ? "Subiendo..." : "Foto:"}</span>
          <input
            ref={entradaFichero}
            type="file"
            accept="image/*"
            disabled={ocupado}
            onChange={(evento) => {
              const fichero = evento.target.files?.[0];
              if (fichero) void subir(fichero);
            }}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
