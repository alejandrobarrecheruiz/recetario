import { ObjectId } from "mongodb";
import type { Receta, RecetaDoc, RecetaEntrada } from "@/models/receta";

/**
 * Conversion entre las dos formas de una receta:
 *
 *   - `Receta`: identificadores en hex de 24 (serializable; es lo que validan
 *     los esquemas Zod y lo que viaja por la API y los formularios).
 *   - `RecetaDoc`: identificadores como `ObjectId` (lo que vive en Mongo).
 *
 * Solo de servidor: importa el constructor de ObjectId. Los componentes de
 * cliente trabajan siempre con `Receta`.
 */

/**
 * `publicadaEn` lo decide el servidor: se fija la primera vez que la receta
 * pasa a "publicada" y se conserva despues (volver a borrador no la borra;
 * republicar mantiene la fecha original).
 */
export function resolverPublicadaEn(entrada: RecetaEntrada): Date | null {
  if (entrada.estado === "publicada" && entrada.publicadaEn === null) {
    return new Date();
  }
  return entrada.publicadaEn;
}

/** De la forma validada (ids en hex) a la que vive en Mongo. */
export function recetaADoc(receta: Receta): RecetaDoc {
  return {
    ...receta,
    _id: new ObjectId(receta._id),
    autorId: new ObjectId(receta.autorId),
    portadaId: receta.portadaId === null ? null : new ObjectId(receta.portadaId),
    pasos: receta.pasos.map((paso) => ({
      ...paso,
      imagenId: paso.imagenId === null ? null : new ObjectId(paso.imagenId),
    })),
  };
}

/** De Mongo a la forma serializable que entiende el resto de la aplicacion. */
export function docAReceta(doc: RecetaDoc): Receta {
  return {
    ...doc,
    _id: doc._id.toHexString(),
    autorId: doc.autorId.toHexString(),
    portadaId: doc.portadaId === null ? null : doc.portadaId.toHexString(),
    pasos: doc.pasos.map((paso) => ({
      ...paso,
      imagenId: paso.imagenId === null ? null : paso.imagenId.toHexString(),
    })),
  };
}
