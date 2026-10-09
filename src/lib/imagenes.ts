import { MongoServerError, ObjectId, type Collection } from "mongodb";
import type { Imagen, ImagenDoc } from "@/models/imagen";
import { rutaImagen } from "@/lib/entrega-imagenes";

export function imagenParaCliente(doc: ImagenDoc): Imagen {
  return { ...docAImagen(doc), url: rutaImagen(doc._id.toHexString()) };
}

/**
 * Un archivo del proveedor tiene un único documento. Reintentar el alta no
 * cambia ni su identificador ni sus metadatos (incluida la receta de origen).
 * Requiere el índice único proveedor_fileId_unico, también entre peticiones.
 */
export async function registrarImagen(coleccion: Collection<ImagenDoc>, imagen: ImagenDoc) {
  const identidad = { proveedor: imagen.proveedor, fileId: imagen.fileId };
  try {
    const resultado = await coleccion.findOneAndUpdate(
      identidad,
      { $setOnInsert: imagen },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    if (!resultado.value) throw new Error("No se pudo confirmar el registro de la imagen.");
    return { imagen: resultado.value, creada: Boolean(resultado.lastErrorObject?.upserted) };
  } catch (error) {
    // Dos altas simultáneas pueden competir por el índice: devolver la ganadora.
    if (error instanceof MongoServerError && error.code === 11000) {
      const existente = await coleccion.findOne(identidad);
      if (existente) return { imagen: existente, creada: false };
    }
    throw error;
  }
}

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

export function docAImagen(doc: ImagenDoc): Imagen {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    recetaId: doc.recetaId === null ? null : doc.recetaId.toHexString(),
    subidaPor: doc.subidaPor.toHexString(),
  };
}
