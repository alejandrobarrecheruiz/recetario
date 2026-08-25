import { upload } from "@imagekit/next";
import type { Imagen, TipoImagen } from "@/models/imagen";

/**
 * Flujo de subida del panel, el de CLAUDE.md:
 *
 *   1. Pide a /api/imagenes/firma unas credenciales de un solo uso.
 *   2. Sube el fichero DESDE EL NAVEGADOR directo a ImageKit (los bytes no
 *      pasan por nuestras funciones: limite de ~4 MB en Vercel).
 *   3. Registra los metadatos en /api/imagenes y devuelve la Imagen creada.
 *
 * Solo se importa desde componentes de cliente (el editor del panel).
 */
export async function subirImagen({
  fichero,
  recetaId,
  tipo,
  alt,
}: {
  fichero: File;
  recetaId: string;
  tipo: TipoImagen;
  alt: string;
}): Promise<Imagen> {
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
    throw new Error("ImageKit no devolvió los metadatos de la subida.");
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
      alt,
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

  return respuestaMetadatos.json();
}

/** Borra de verdad: fichero en ImageKit, metadatos y referencias. */
export async function quitarImagen(id: string): Promise<void> {
  const respuesta = await fetch(`/api/imagenes/${id}`, { method: "DELETE" });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.error ?? "No se pudo borrar la imagen.");
  }
}
