import { ObjectId } from "mongodb";
import type { Imagen, ImagenDoc } from "@/models/imagen";

/**
 * Conversion entre las dos formas de una imagen, igual que en lib/recetas.ts:
 * `Imagen` (ids en hex, serializable) e `ImagenDoc` (ObjectId, lo que vive en
 * Mongo). Solo de servidor.
 */

export function imagenADoc(imagen: Imagen): ImagenDoc {
  return {
    ...imagen,
    _id: new ObjectId(imagen._id),
    recetaId: imagen.recetaId === null ? null : new ObjectId(imagen.recetaId),
    subidaPor: new ObjectId(imagen.subidaPor),
  };
}

/**
 * URL de entrega con transformacion de ImageKit: ancho fijado y compresion.
 * Las transformaciones y el CDN son gratis; el navegador nunca descarga la
 * foto original de la camara.
 */
export function urlConAncho(url: string, ancho: number): string {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}tr=w-${ancho},q-80`;
}

export function docAImagen(doc: ImagenDoc): Imagen {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    recetaId: doc.recetaId === null ? null : doc.recetaId.toHexString(),
    subidaPor: doc.subidaPor.toHexString(),
  };
}
